import invariant from "tiny-invariant";
import { match, P } from "ts-pattern";
import { type ZodType, z } from "zod";

export const lottieJsonSchema = z.record(z.string(), z.unknown());
export const dotLottieAnimationSchema = z.object({
  id: z.string(),
});
export const dotLottieManifestSchema = z.object({
  version: z.string(),
  author: z.string().optional(),
  generator: z.string().optional(),
  animations: z.array(dotLottieAnimationSchema),
});

export type LottieJson = z.infer<typeof lottieJsonSchema>;
export type DotLottieAnimation = z.infer<typeof dotLottieAnimationSchema>;
export type DotLottieManifest = z.infer<typeof dotLottieManifestSchema>;

export type DotLottieArchive = {
  manifest: DotLottieManifest;
  animations: Record<string, LottieJson>;
};

type ZipFile = {
  name: string;
  contents: Uint8Array;
};

type ZipCentralDirectoryEntry = {
  name: string;
  compressedSize: number;
  compressionMethod: number;
  localHeaderOffset: number;
  uncompressedSize: number;
};

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const endOfCentralDirectorySignature = 0x06054b50;
const centralDirectorySignature = 0x02014b50;
const localFileHeaderSignature = 0x04034b50;
const localFileHeaderSize = 30;
const centralDirectoryHeaderSize = 46;
const endOfCentralDirectorySize = 22;
const deflateCompressionMethod = 8;
const storedCompressionMethod = 0;
const maxEndOfCentralDirectorySearch = 0xffff + endOfCentralDirectorySize;

const toUint8Array = (input: Uint8Array | ArrayBuffer) => {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
};

const parseJson = <T>(contents: Uint8Array, schema: ZodType<T>): T => {
  return schema.parse(JSON.parse(textDecoder.decode(contents)));
};

const encodeJson = (value: unknown) => {
  return textEncoder.encode(JSON.stringify(value));
};

const createCrcTable = () => {
  return Array.from({ length: 256 }, (_, index) => {
    return Array.from({ length: 8 }).reduce((crc) => {
      return (crc as number) & 1 ? 0xedb88320 ^ ((crc as number) >>> 1) : (crc as number) >>> 1;
    }, index) as number;
  });
};

const crcTable = createCrcTable();

const crc32 = (contents: Uint8Array) => {
  const crc = contents.reduce((currentCrc, byte) => {
    return (currentCrc >>> 8) ^ crcTable[(currentCrc ^ byte) & 0xff];
  }, 0xffffffff);

  return (crc ^ 0xffffffff) >>> 0;
};

const readUInt16 = (archive: Uint8Array, offset: number) => {
  return new DataView(archive.buffer, archive.byteOffset, archive.byteLength).getUint16(
    offset,
    true,
  );
};

const readUInt32 = (archive: Uint8Array, offset: number) => {
  return new DataView(archive.buffer, archive.byteOffset, archive.byteLength).getUint32(
    offset,
    true,
  );
};

const writeUInt16 = (value: number) => {
  const output = new Uint8Array(2);

  new DataView(output.buffer).setUint16(0, value, true);

  return output;
};

const writeUInt32 = (value: number) => {
  const output = new Uint8Array(4);

  new DataView(output.buffer).setUint32(0, value, true);

  return output;
};

const concatUint8Arrays = (parts: Uint8Array[]) => {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.byteLength;
  });

  return output;
};

const transformBytes = async (
  contents: Uint8Array,
  transformStream: CompressionStream | DecompressionStream,
) => {
  const stream = new ReadableStream<BufferSource>({
    start: (controller) => {
      const byteCopy = new Uint8Array(contents.byteLength);

      byteCopy.set(contents);
      controller.enqueue(byteCopy);
      controller.close();
    },
  });

  return new Uint8Array(await new Response(stream.pipeThrough(transformStream)).arrayBuffer());
};

const deflateRaw = async (contents: Uint8Array) => {
  return transformBytes(contents, new CompressionStream("deflate-raw"));
};

const inflateRaw = async (contents: Uint8Array) => {
  return transformBytes(contents, new DecompressionStream("deflate-raw"));
};

const findEndOfCentralDirectoryOffset = (archive: Uint8Array) => {
  const start = Math.max(0, archive.byteLength - maxEndOfCentralDirectorySearch);

  for (let offset = archive.byteLength - endOfCentralDirectorySize; offset >= start; offset -= 1) {
    if (readUInt32(archive, offset) === endOfCentralDirectorySignature) {
      return offset;
    }
  }

  throw new Error("Invalid .lottie archive: missing end of central directory.");
};

const readCentralDirectory = (archive: Uint8Array) => {
  const endOffset = findEndOfCentralDirectoryOffset(archive);
  const entryCount = readUInt16(archive, endOffset + 10);
  let offset = readUInt32(archive, endOffset + 16);

  return Array.from({ length: entryCount }, () => {
    if (readUInt32(archive, offset) !== centralDirectorySignature) {
      throw new Error("Invalid .lottie archive: malformed central directory.");
    }

    const compressionMethod = readUInt16(archive, offset + 10);
    const compressedSize = readUInt32(archive, offset + 20);
    const uncompressedSize = readUInt32(archive, offset + 24);
    const nameLength = readUInt16(archive, offset + 28);
    const extraLength = readUInt16(archive, offset + 30);
    const commentLength = readUInt16(archive, offset + 32);
    const localHeaderOffset = readUInt32(archive, offset + 42);
    const nameStart = offset + centralDirectoryHeaderSize;
    const nameEnd = nameStart + nameLength;
    const name = textDecoder.decode(archive.subarray(nameStart, nameEnd));

    offset = nameEnd + extraLength + commentLength;

    return {
      name,
      compressedSize,
      compressionMethod,
      localHeaderOffset,
      uncompressedSize,
    };
  });
};

const readLocalFile = async (archive: Uint8Array, entry: ZipCentralDirectoryEntry) => {
  const offset = entry.localHeaderOffset;

  invariant(
    readUInt32(archive, offset) === localFileHeaderSignature,
    `Invalid .lottie archive: malformed local header for ${entry.name}.`,
  );

  const nameLength = readUInt16(archive, offset + 26);
  const extraLength = readUInt16(archive, offset + 28);
  const dataStart = offset + localFileHeaderSize + nameLength + extraLength;
  const compressedData = archive.subarray(dataStart, dataStart + entry.compressedSize);

  return match(entry.compressionMethod)
    .with(storedCompressionMethod, () => compressedData)
    .with(deflateCompressionMethod, async () => {
      const contents = await inflateRaw(compressedData);

      invariant(
        contents.byteLength === entry.uncompressedSize,
        `Invalid .lottie archive: size mismatch for ${entry.name}.`,
      );

      return contents;
    })
    .with(P.number, (compressionMethod) => {
      throw new Error(
        `Unsupported .lottie compression method ${compressionMethod} for ${entry.name}.`,
      );
    })
    .exhaustive();
};

const readZipFiles = async (archive: Uint8Array) => {
  const entries = readCentralDirectory(archive);

  return Promise.all(
    entries.map(async (entry) => {
      return {
        name: entry.name,
        contents: await readLocalFile(archive, entry),
      };
    }),
  );
};

const createLocalFileHeader = (
  fileName: Uint8Array,
  file: ZipFile,
  compressedContents: Uint8Array,
) => {
  return concatUint8Arrays([
    writeUInt32(localFileHeaderSignature),
    writeUInt16(20),
    writeUInt16(0),
    writeUInt16(deflateCompressionMethod),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt32(crc32(file.contents)),
    writeUInt32(compressedContents.byteLength),
    writeUInt32(file.contents.byteLength),
    writeUInt16(fileName.byteLength),
    writeUInt16(0),
    fileName,
  ]);
};

const createCentralDirectoryHeader = (
  fileName: Uint8Array,
  file: ZipFile,
  compressedContents: Uint8Array,
  localHeaderOffset: number,
) => {
  return concatUint8Arrays([
    writeUInt32(centralDirectorySignature),
    writeUInt16(20),
    writeUInt16(20),
    writeUInt16(0),
    writeUInt16(deflateCompressionMethod),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt32(crc32(file.contents)),
    writeUInt32(compressedContents.byteLength),
    writeUInt32(file.contents.byteLength),
    writeUInt16(fileName.byteLength),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt32(0),
    writeUInt32(localHeaderOffset),
    fileName,
  ]);
};

const writeZipFiles = async (files: ZipFile[]) => {
  const entries = await Promise.all(
    files.map(async (file) => {
      return {
        file,
        fileName: textEncoder.encode(file.name),
        compressedContents: await deflateRaw(file.contents),
      };
    }),
  );

  const localFileParts: Uint8Array[] = [];
  const centralDirectoryParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach(({ file, fileName, compressedContents }) => {
    const localFileHeader = createLocalFileHeader(fileName, file, compressedContents);

    localFileParts.push(localFileHeader, compressedContents);
    centralDirectoryParts.push(
      createCentralDirectoryHeader(fileName, file, compressedContents, offset),
    );
    offset += localFileHeader.byteLength + compressedContents.byteLength;
  });

  const centralDirectory = concatUint8Arrays(centralDirectoryParts);
  const centralDirectoryOffset = offset;
  const endOfCentralDirectory = concatUint8Arrays([
    writeUInt32(endOfCentralDirectorySignature),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(entries.length),
    writeUInt16(entries.length),
    writeUInt32(centralDirectory.byteLength),
    writeUInt32(centralDirectoryOffset),
    writeUInt16(0),
  ]);

  return concatUint8Arrays([...localFileParts, centralDirectory, endOfCentralDirectory]);
};

const getRequiredFile = (files: ZipFile[], name: string) => {
  const file = files.find((zipFile) => zipFile.name === name);

  if (!file) {
    throw new Error(`Invalid .lottie archive: missing ${name}.`);
  }

  return file;
};

export const decompressDotLottie = async (
  archiveSource: Uint8Array | ArrayBuffer,
): Promise<DotLottieArchive> => {
  const archive = toUint8Array(archiveSource);
  const files = await readZipFiles(archive);
  const manifest = parseJson(
    getRequiredFile(files, "manifest.json").contents,
    dotLottieManifestSchema,
  );
  const animations = Object.fromEntries(
    manifest.animations.map((animation) => {
      const file = getRequiredFile(files, `animations/${animation.id}.json`);

      return [animation.id, parseLottieJson(file.contents)];
    }),
  );

  return {
    manifest,
    animations,
  };
};

export const decompressDotLottieToJson = async (
  archive: Uint8Array | ArrayBuffer,
  animationId = "main",
) => {
  const dotLottie = await decompressDotLottie(archive);
  const animation = dotLottie.animations[animationId];

  if (!animation) {
    throw new Error(`Invalid .lottie archive: missing animation ${animationId}.`);
  }

  return animation;
};

export const compressJsonToDotLottie = async (
  animation: LottieJson,
  options: {
    animationId?: string;
    manifest?: Partial<Omit<DotLottieManifest, "animations">>;
  } = {},
) => {
  const animationId = options.animationId ?? "main";
  const manifest: DotLottieManifest = {
    version: options.manifest?.version ?? "1.0.0",
    ...options.manifest,
    animations: [{ id: animationId }],
  };

  return writeZipFiles([
    {
      name: "manifest.json",
      contents: encodeJson(manifest),
    },
    {
      name: `animations/${animationId}.json`,
      contents: encodeJson(animation),
    },
  ]);
};

export const parseLottieJson = (source: Uint8Array | ArrayBuffer | string): LottieJson => {
  const contents = typeof source === "string" ? source : textDecoder.decode(toUint8Array(source));

  return lottieJsonSchema.parse(JSON.parse(contents));
};

export const readLottieJson = async (
  fileName: string,
  contents: Uint8Array | ArrayBuffer | string,
) => {
  const normalizedFileName = fileName.toLowerCase();

  if (normalizedFileName.endsWith(".lottie")) {
    invariant(typeof contents !== "string", ".lottie contents must be binary data.");

    return decompressDotLottieToJson(contents);
  }

  return parseLottieJson(contents);
};
