## js13kserver-packer

This is a toolchain for building a multiplayer WebGL game for the js13kgames competition server category.
The goal of this project is to have a system that does lots of little things to make the final bundle
as small as possible so that a game submission can be developed without worrying about tiny optimizations.

The main build script acts as a front-end to UglifyJS. It performs a bunch of domain-specific optimizations, including
running shaders through a minifier, and then feeds the minifier-friendly result to UglifyJS. The final results are
copied in to the public folder of the test server, which is included as a submodule to this repository, and then
ADVZIP is used to create the bundle intended for submission.

#### JavaScript Bundling and Optimizations

There are three main entrypoints in to the codebase: `client.js`, `server.js`, and `shared.js`. These files are loaded, 
processed, and exported individually. The code in `client.js` will end up embedded in `index.html`, and the other two
files will produce output files of the same name.

Inside any of the main JS files you can directly inline another js file by placing a
comment of the format `//__include otherfile.inc.js`. The `inc` is not technically important, just conventional
in this project. The intention with using these inline directives instead of `require` or something similar is to
avoid any module loading boilerplate at all costs. Functions that live in `.inc.js` files are prefixed with namespaces
to avoid collision, and once inlined in the main source file they are reduced to single-letter names or further inlined
by UglifyJS.

The `shared.js` file is handled slightly differently than `client.js` and `server.js`. In order to easily shrink the names
of shared symbols between client and server, top-level variables in `shared.js` are prefixed with `$`. This is just to make
finding them easier and unambiguous in the lazy build script. When these variables, prefixed by `$`, are found in either of
the other main source files, they are minified to matching names.

Since this toolchain is geared specifically towards using WebGL, there's a bit of magic that happens to make the WebGL
context functions and constants smaller. *TODO Explain name mangling*

*TODO mention external resource filename minification*

#### Shader Bundling and Optimizations

All of the GLSL shaders live in the `/shaders` folder.  Their contents can be accessed directly as strings
in the client code via the generated file `shaders.gen.js` by replacing the `.` in the filename with a `_`.
For example, the shader `ship.frag` is available in the client code via the variable `ship_frag`. Shaders
must have a `.frag`, `.vert` or `.glsl` file extension.

The bulk of the shader minification work is done by a third-party tool called [Shader Minifier](http://www.ctrl-alt-test.fr/glsl-minifier/). Take a look through the features listed on the site if you're curious about the details of what
it does to the code.

Inside the shader code, attributes, varyings, and uniforms must be prefixed with `a_`, `v_`, and `u_` respectively.
This is because the post-processing step is dumb and just looks for identifiers with those prefixes to minify. These shader
external variables are minified to matching names in the client JS code as well.

It's also possible to share code between shaders using `.glsl` files. In a `.frag` or `.vert` file, place the
`//__include example.glsl` directive at the top of the file to import the include file. Inside of the include file
you must mark functions that you want to be visible to the importer with `//__export`. This is so that the minifier
can be sure that the function name gets mangled to the same value at all of the import sites. Currently `.glsl`
files can only import other `.glsl` files *if the file with the import directive sorts later in an alphabetical list
than the file it is importing*.

#### Provided tools and library code

*TODO explain the library code contents and sample game architecture*
