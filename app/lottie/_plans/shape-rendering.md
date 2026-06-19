* Each possible [shape](../_lib/types/_docs/shapes.md) should be renderable in isolation
* Have a simple page that displays a canvas rendering just that object at identity matrix (no transform)
* Have controls alongside each shape that corresponds to each of the shape attributes
* Canvas rendering technique can be rudimentary for now
* Using the discriminated union on the shape, we can exhaustively pattern match and have a clean branch per shape