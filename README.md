# CubeCraft 3D Puzzle Lab

A browser-based 3D voxel puzzle prototype. Change the grid size, the size of each block, and the visual difficulty; rotate the preview; and export the colored groups as individual STL files in a ZIP.

## Run it

1. Open this `CubeCraft3D` folder in Visual Studio Code (`File → Open Folder…`).
2. Start a local web server in the folder. With Python installed, open the VS Code terminal and run:

   ```powershell
   py -m http.server 8000
   ```

   If `py` is unavailable, try `python -m http.server 8000`.
3. Open [http://localhost:8000](http://localhost:8000) in a browser.
4. To stop the server, focus the terminal and press `Ctrl+C`.

The page loads Three.js modules from jsDelivr, so an internet connection is needed when opening the site.

## Files

- `index.html` — page structure and Three.js module import map.
- `style.css` — layout, typography, controls, and responsive styling.
- `script.js` — preview, puzzle generation, camera controls, and STL ZIP export.

## Prototype limitation

Generated models are connected voxel pieces with a small clearance between neighboring pieces, and each STL contains the full piece surface. They are **not validated mechanical interlocking puzzles**. The difficulty setting changes the number and size of color groups; it does not prove a solvable assembly sequence. Check dimensions, clearances, printer tolerances, and each exported part in your slicer before printing.

