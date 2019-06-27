## js13k-template

This is a toolchain for building a multiplayer WebGL game for the js13kgames competition server category.
The goal of this project is to have a system that does lots of little things to make the final bundle
as small as possible so that a game submission can be developed without worrying about tiny optimizations.

#### JavaScript Bundling and Optimizations

- `//__include` directive
- WebGL context function name mangling
- shared.js
- UglifyJS

#### Shader Bundling and Optimizations

All of the GLSL shaders live in the `/shaders` folder.  Their contents can be accessed directly as strings
in the client code via the generated file `shaders.gen.js` by replacing the `.` in the filename with a `_`.
For example, the shader `ship.frag` is available in the client code via the variable `ship_frag`. Shaders
must have a `.frag`, `.vert` or `.glsl` file extension.

Inside the shader code, attributes, varyings, and uniforms must be prefixed with `a_`, `v_`, and `u_` respectively.
This is because the minifier is lazy and just looks for identifiers with those prefixes to minify. These shader
external variables are minified to matching names in the client JS code as well.

It's also possible to share code between shaders using `.glsl` files. In a `.frag` or `.vert` file, place the
`//__include example.glsl` directive at the top of the file to import the include file. Inside of the include file
you must mark functions that you want to be visible to the importer with `//__export`. This is so that the minifier
can be sure that the function name gets mangled to the same value at all of the import sites. Currently `.glsl`
files can only import other `.glsl` files *if the file with the import directive sorts later in an alphabetical list
than the file it is importing*.

#### Zip Packing

- Filename minification
