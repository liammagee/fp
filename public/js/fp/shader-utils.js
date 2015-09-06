
define( [

        'fp/fp-base'

    ],

    function( FiercePlanet ) {


        /**
         * Shader utilites - wrappers around Three.js Lambert and Phong shaders.
         */
        FiercePlanet.ShaderUtils = {

            buildingVertexShaderParams: function() {
                var shader =
                    `
                        varying vec3 pos;
                        varying float vMixin;
                        attribute float mixin;
                        uniform float time;
                    `;
                return shader;
            },
            buildingVertexShaderMain: function() {
                var shader = `
                        pos = position;
                        vMixin = mixin;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                    `;
                return shader;
            },

            buildingFragmentShaderParams: function() {
                var shader = `
                        uniform float time;
                        uniform vec2 location;
                        uniform vec2 resolution;
                        uniform vec3 dimensions;
                        uniform float bottomWindow;
                        uniform float topWindow;
                        uniform float windowWidth;
                        uniform float windowPercent;
                        uniform float floorLevel;
                        uniform float lineWidth;
                        uniform int showLines;
                        uniform int showFill;
                        uniform int showWindows;
                        uniform int fillRooves;
                        uniform vec3 lineColor;
                        uniform vec3 fillColor;
                        uniform vec3 windowColor;
                        varying vec3 pos;
                        varying float vMixin;

                        // Basic random generator, taken from http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
                        // and http://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
                        // For something more sophisticated try github.com/ashima/webgl-noise
                        float rand( vec2 co ) {
                            return fract( sin( dot( co.xy ,vec2( 12.9898,78.233 )) ) * 43758.5453 );
                        }
                    `;
                return shader;
            },
            buildingFragmentShaderMain: function() {
                var shader = `
                        vec3 darkGrey = vec3( 0.1,0.1,0.1 );
                        vec4 col = vec4( darkGrey, 1. );
                        float opacity = 1.;
                        if ( showFill == 1 ) {
                            col = vec4( mix( fillColor, darkGrey, rand( location ) ), opacity );
                        }
                        bool colorise = false;
                        float dimX = dimensions.x;
                        float dimY = dimensions.y;
                        float dimZ = dimensions.z;
                        float posX = pos.x;
                        float posY = mod( pos.z, dimY );
                        float levels = floor( pos.z / dimY );
                        float posZ = pos.y;

                        // Paint windows
                        if ( showWindows == 1 ) {
                            // Normalise height
                            float height = 1.0 - posY / dimY;
                            if ( height > bottomWindow && height < topWindow ) {
                                float p = 0.;
                                if ( posX < ( floor( dimX / 2.0 ) - 1.0 ) && posX > -( floor( dimX / 2.0 ) - 1.0 )) {
                                    float width = ( posX + dimX / 2.0 );
                                    float m = mod( width, windowWidth );
                                    p = abs( floor( width / windowWidth ) );
                                    float offsetL = windowWidth * ( (1.0 - windowPercent ) / 2.0 );
                                    float offsetR = windowWidth - offsetL;
                                    if ( m > offsetL && m < offsetR )
                                        colorise = true;
                                }
                                if ( posZ < ( floor( dimZ / 2.0 ) - 1.0 ) && posZ > -( floor( dimZ / 2.0 ) - 1.0 )) {
                                    float width = ( posZ + dimZ / 2.0 );
                                    float m = mod( width, windowWidth );
                                    p = abs( floor( width / windowWidth ) );
                                    float offsetL = windowWidth * ( (1.0 - windowPercent ) / 2.0 );
                                    float offsetR = windowWidth - offsetL;
                                    if ( m > offsetL && m < offsetR )
                                        colorise = true;
                                }
                                if ( colorise ) {
                                    col = vec4( mix( darkGrey, windowColor, pow( rand( vec2( p, levels ) ), vMixin ) ), opacity );
                                }
                            }
                        }
                        if ( showLines == 1 ) {
                            // Rules for horizontal lines
                            // IGNORE BOTTOM LINE FOR NOW:  || posY > dimY - lineWidth
                            if ( posY == 0.0 && fillRooves == 1 )  {
                                col = vec4( mix( windowColor, darkGrey, 0.5 ), opacity );
                            }
                            else if ( posY < lineWidth ) {
                                // This gives just lines
                                if ( posZ < - ( dimZ / 2.0 ) + lineWidth || posZ > ( dimZ / 2.0 ) - lineWidth )
                                    col = vec4( lineColor, opacity );
                                if ( posX < - ( dimX / 2.0 ) + lineWidth || posX > ( dimX / 2.0 ) - lineWidth )
                                    col = vec4( lineColor, opacity );
                            }
                            else {
                                // Rules for vertical lines
                                if ( posZ < - ( dimZ / 2.0 ) + lineWidth )
                                    if ( posX < - ( dimX / 2.0 ) + lineWidth || posX > ( dimX / 2.0 ) - lineWidth )
                                        col = vec4( lineColor, opacity );
                                if ( posZ > ( dimZ / 2.0 ) - lineWidth )
                                    if ( posX < - ( dimX / 2.0 ) + lineWidth || posX > ( dimX / 2.0 ) - lineWidth )
                                        col = vec4( lineColor, opacity );
                            }
                        }
                        outgoingLight = vec3( col.r, col.g, col.b );
                        diffuseColor = vec4( col.r, col.g, col.b, col.a );
                    `;
                    return shader;
                },

                terrainVertexShaderParams: function() {
                    var shader = `
                        uniform float size;
                        uniform float maxHeight;
                        attribute float height;
                        attribute float trail;
                        attribute float patch;
                        varying float vHeight;
                        varying float vTrail;
                        varying float vPatch;
                        `;
                    return shader;
                },
                terrainVertexShaderMain: function() {
                    var shader = `
                            vHeight = height;
                            vTrail = trail;
                            vPatch = patch;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4( position,1.0 );
                        `;
                    return shader;
                },

                terrainFragmentShaderParams: function() {
                    var shader = `
                            uniform float size;
                            uniform float maxHeight;
                            varying float vHeight;
                            varying float vTrail;
                            varying float vPatch;
                            // Terrain colors
                            uniform vec3 groundLevelColor;
                            uniform vec3 lowland1Color;
                            uniform vec3 lowland2Color;
                            uniform vec3 midland1Color;
                            uniform vec3 midland2Color;
                            uniform vec3 highlandColor;
                            uniform float stop1;
                            uniform float stop2;
                            uniform float stop3;
                            uniform float stop4;
                            uniform float stop5;
                            // Mix shadows
                            uniform float shadowMix;
                        `;
                    return shader;
                },
                terrainFragmentShaderMain: function() {
                    var shader = `
                        vec4 groundLevel = vec4( groundLevelColor, opacity );
                        vec4 lowland1 = vec4( lowland1Color, opacity );
                        vec4 lowland2 = vec4( lowland2Color, opacity );
                        vec4 midland1 = vec4( midland1Color, opacity );
                        vec4 midland2 = vec4( midland2Color, opacity );
                        vec4 highland = vec4( highlandColor, opacity );
                        float range;
                        vec4 col;

                        float alphaChannel = opacity;
                        vec3 diffusion = diffuse;
                        float elevation = vHeight / maxHeight;
                        if ( vPatch > 0.0 ) {
                            if ( elevation <=  0.0 ) {
                                col = vec4( 0.0, 0.0, 0.0, 0.0 );
                                alphaChannel = 0.0;
                                diffusion = vec3( 0.0, 0.0, 0.0 );
                            }
                            else {
                                col = vec4( vPatch, vPatch, vPatch, 1.0 );
                            }
                        }
                        else if ( vTrail > 0.0 ) {
                            col = vec4( vTrail, vTrail, vTrail, 1.0 );
                        }
                        else {
                            if ( elevation == 0.0 ) {
                                col = vec4( 0.0, 0.0, 0.0, 0.0 );
                                alphaChannel = 0.0;
                                diffusion = vec3( 0.0, 0.0, 0.0 );
                            }
                            else if ( elevation < stop1 ) {
                                range = ( elevation - 0.0 ) * ( 1.0 / stop1 );
                                col = mix( groundLevel, lowland1, range );
                            }
                            else if ( elevation < stop2 ) {
                                range = ( elevation - stop1 ) * ( 1.0 / ( stop2 - stop1 ) );
                                col = mix( lowland1, lowland2, range );
                            }
                            else if ( elevation < stop3 ) {
                                range = ( elevation - stop2 ) * ( 1.0 / ( stop3 - stop2 ) );
                                col = mix( lowland2, midland1, range );
                            }
                            else if ( elevation < stop4 ) {
                                range = ( elevation - stop3 ) * ( 1.0 / ( stop4 - stop3 ) );
                                col = mix( midland1, midland2, range );
                            }
                            else if ( elevation < stop5 ) {
                                range = ( elevation - stop4 ) * ( 1.0 / ( stop5 - stop4 ) );
                                col = mix( midland2, highland, range );
                            }
                            else  {
                                col = highland;
                            }
                        }
                        //outgoingLight = vec3( col.r, col.g, col.b );
                        //diffuseColor = vec4( diffuse, alphaChannel );

                        // Allow for a blending of shadows and gradient colors
                        vec4 tmp = mix( vec4( outgoingLight, 0.0 ), col, shadowMix );
                        outgoingLight = vec3( tmp.r, tmp.g, tmp.b );
                        diffuseColor = vec4( diffusion, alphaChannel );
                        `;

                    return shader;
                },

                agentVertexShader: function() {
                    var shader = `
                        uniform float size;
                        attribute float alpha;
                        attribute vec3 color;
                        varying float vAlpha;
                        varying vec3 vColor;


                        void main() {
                            vAlpha = alpha;
                            vColor = color; // set RGB color associated to vertex; use later in fragment shader.

                            // Add half the size, so the agent is drawn from the feet up.
                            vec3 modifiedPosition = position;
                            modifiedPosition.y += size / 2.0;
                            vec4 mvPosition = modelViewMatrix * vec4( modifiedPosition, 1.0 );

                            // option ( 1 ): draw particles at constant size on screen
                            // gl_PointSize = size;
                            // option ( 2 ): scale particles as objects in 3D space
                            gl_PointSize = 1.0 * size * ( 300.0 / length( mvPosition.xyz ) );
                            gl_Position = projectionMatrix * mvPosition;
                        }
                        `;
                    return shader;
                },
                agentFragmentShader: function() {
                    var shader = `
                        uniform float size;
                        uniform sampler2D texture;
                        varying vec3 vColor;
                        varying float vAlpha;

                        void main() {
                            gl_FragColor = vec4( vColor, vAlpha );
                            // sets a white particle texture to desired color
                            gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );
                        }
                        `;
                    return shader;
                },

                // LAMBERT SHADER OVERRIDE FOR SHADOWS

                /**
                 * Returns an array of Lambert uniforms.
                 * @param  {Array} otherUniforms
                 * @return {Array} Merged array of uniforms
                 */
                lambertUniforms: function( otherUniforms ) {

                    var uniforms = THREE.UniformsUtils.merge( [
                            THREE.UniformsLib[ "common" ],
                            THREE.UniformsLib[ "fog" ],
                            THREE.UniformsLib[ "lights" ],
                            THREE.UniformsLib[ "shadowmap" ],
                            {
                                "emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
                                "wrapRGB"  : { type: "v3", value: new THREE.Vector3( 1, 1, 1 ) }
                            }
                        ] );
                    return _.extend( uniforms, otherUniforms );

                },

                /**
                 * Generates a vertex shader for a Lambert shader.
                 */
                lambertShaderVertex: function ( customParams, customCode ) {
                    var vertexShader = [
                        customParams,

                        `
                            #define LAMBERT

                            varying vec3 vLightFront;

                            #ifdef DOUBLE_SIDED

                               varying vec3 vLightBack;

                            #endif
                        `,

                        // Needed for three.js r71
                        THREE.ShaderChunk[ "common" ],

                        THREE.ShaderChunk[ "map_pars_vertex" ],
                        THREE.ShaderChunk[ "lightmap_pars_vertex" ],
                        THREE.ShaderChunk[ "envmap_pars_vertex" ],
                        THREE.ShaderChunk[ "lights_lambert_pars_vertex" ],
                        THREE.ShaderChunk[ "color_pars_vertex" ],
                        THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
                        THREE.ShaderChunk[ "skinning_pars_vertex" ],
                        THREE.ShaderChunk[ "shadowmap_pars_vertex" ],
                        THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],

                        `void main() {`,

                        customCode,


                        THREE.ShaderChunk[ "map_vertex" ],
                        THREE.ShaderChunk[ "lightmap_vertex" ],
                        THREE.ShaderChunk[ "color_vertex" ],

                        THREE.ShaderChunk[ "morphnormal_vertex" ],
                        THREE.ShaderChunk[ "skinbase_vertex" ],
                        THREE.ShaderChunk[ "skinnormal_vertex" ],
                        THREE.ShaderChunk[ "defaultnormal_vertex" ],

                        THREE.ShaderChunk[ "morphtarget_vertex" ],
                        THREE.ShaderChunk[ "skinning_vertex" ],
                        THREE.ShaderChunk[ "default_vertex" ],
                        THREE.ShaderChunk[ "logdepthbuf_vertex" ],

                        THREE.ShaderChunk[ "worldpos_vertex" ],
                        THREE.ShaderChunk[ "envmap_vertex" ],
                        THREE.ShaderChunk[ "lights_lambert_vertex" ],
                        THREE.ShaderChunk[ "shadowmap_vertex" ],

                        `}`

                    ].join( "\n" );

                    return vertexShader;
                },
                lambertShaderFragment: function ( customParams, customCode ) {

                    var fragmentShader = [

                        customParams,

                        `
                        uniform vec3 diffuse;
                        uniform vec3 emissive;
                        uniform float opacity;

                        varying vec3 vLightFront;

                        #ifdef DOUBLE_SIDED

                           varying vec3 vLightBack;

                        #endif
                        `,

                        THREE.ShaderChunk[ "common" ],
                        THREE.ShaderChunk[ "color_pars_fragment" ],
                        THREE.ShaderChunk[ "map_pars_fragment" ],
                        THREE.ShaderChunk[ "alphamap_pars_fragment" ],
                        THREE.ShaderChunk[ "lightmap_pars_fragment" ],
                        THREE.ShaderChunk[ "envmap_pars_fragment" ],
                        THREE.ShaderChunk[ "fog_pars_fragment" ],
                        THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
                        THREE.ShaderChunk[ "specularmap_pars_fragment" ],
                        THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ],

                        `
                        void main() {

                           vec3 outgoingLight = vec3( 0.0 ); // outgoing light does not have an alpha, the surface does
                           vec4 diffuseColor = vec4( diffuse, opacity );
                        `,
                        customCode, // must set gl_FragColor!

                        THREE.ShaderChunk[ "logdepthbuf_fragment" ],
                        THREE.ShaderChunk[ "map_fragment" ],
                        THREE.ShaderChunk[ "color_fragment" ],
                        THREE.ShaderChunk[ "alphamap_fragment" ],
                        THREE.ShaderChunk[ "alphatest_fragment" ],
                        THREE.ShaderChunk[ "specularmap_fragment" ],

                        `
                        #ifdef DOUBLE_SIDED

                           if ( gl_FrontFacing )
                               outgoingLight += diffuseColor.rgb * vLightFront + emissive;
                           else
                               outgoingLight += diffuseColor.rgb * vLightBack + emissive;

                        #else

                           outgoingLight += diffuseColor.rgb * vLightFront + emissive;

                        #endif
                        `,

                        THREE.ShaderChunk[ "lightmap_fragment" ],
                        THREE.ShaderChunk[ "envmap_fragment" ],
                        THREE.ShaderChunk[ "shadowmap_fragment" ],

                        THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

                        THREE.ShaderChunk[ "fog_fragment" ],

                        `
                            gl_FragColor = vec4( outgoingLight, diffuseColor.a ); // TODO, this should be pre-multiplied to allow for bright highlights on very transparent objects
                        }
                        `

                    ].join( "\n" );

                    return fragmentShader;

                },


                // PHONG SHADER OVERRIDE FOR SHADOWS

                /**
                 * Returns an array of Lambert uniforms.
                 * @param  {Array} otherUniforms
                 * @return {Array} Merged array of uniforms
                 */
                phongUniforms: function( otherUniforms ) {

                    var uniforms = THREE.UniformsUtils.merge( [
                        THREE.UniformsLib[ "common" ],
                        THREE.UniformsLib[ "aomap" ],
                        THREE.UniformsLib[ "lightmap" ],
                        THREE.UniformsLib[ "emissivemap" ],
                        THREE.UniformsLib[ "bump" ],
                        THREE.UniformsLib[ "normalmap" ],
                        THREE.UniformsLib[ "fog" ],
                        THREE.UniformsLib[ "lights" ],
                        THREE.UniformsLib[ "shadowmap" ],

                        {
                            "emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
                            "specular" : { type: "c", value: new THREE.Color( 0x000000 ) },
                            "shininess": { type: "f", value: 0 }
                        }
                    ] );
                    return _.extend( uniforms, otherUniforms );

                },

                /**
                 * Generates a vertex shader for a Lambert shader.
                 */
                phongShaderVertex: function ( customParams, customCode ) {
                    var vertexShader = [
                        customParams,

                        "#define PHONG",

                        "varying vec3 vViewPosition;",

                        "#ifndef FLAT_SHADED",

                        "   varying vec3 vNormal;",

                        "#endif",

                        THREE.ShaderChunk[ "common" ],
                        THREE.ShaderChunk[ "uv_pars_vertex" ],
                        THREE.ShaderChunk[ "uv2_pars_vertex" ],
                        THREE.ShaderChunk[ "envmap_pars_vertex" ],
                        THREE.ShaderChunk[ "lights_phong_pars_vertex" ],
                        THREE.ShaderChunk[ "color_pars_vertex" ],
                        THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
                        THREE.ShaderChunk[ "skinning_pars_vertex" ],
                        THREE.ShaderChunk[ "shadowmap_pars_vertex" ],
                        THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],


                        `void main() {`,

                        customCode,
                        THREE.ShaderChunk[ "uv_vertex" ],
                        THREE.ShaderChunk[ "uv2_vertex" ],
                        THREE.ShaderChunk[ "color_vertex" ],

                        THREE.ShaderChunk[ "morphnormal_vertex" ],
                        THREE.ShaderChunk[ "skinbase_vertex" ],
                        THREE.ShaderChunk[ "skinnormal_vertex" ],
                        THREE.ShaderChunk[ "defaultnormal_vertex" ],

                    "#ifndef FLAT_SHADED", // Normal computed with derivatives when FLAT_SHADED

                    "   vNormal = normalize( transformedNormal );",

                    "#endif",

                        THREE.ShaderChunk[ "morphtarget_vertex" ],
                        THREE.ShaderChunk[ "skinning_vertex" ],
                        THREE.ShaderChunk[ "default_vertex" ],
                        THREE.ShaderChunk[ "logdepthbuf_vertex" ],

                    "   vViewPosition = - mvPosition.xyz;",

                        THREE.ShaderChunk[ "worldpos_vertex" ],
                        THREE.ShaderChunk[ "envmap_vertex" ],
                        THREE.ShaderChunk[ "lights_phong_vertex" ],
                        THREE.ShaderChunk[ "shadowmap_vertex" ],

                    "}"

                    ].join( "\n" );

                    return vertexShader;
                },
                phongShaderFragment: function ( customParams, customCode ) {

                    var fragmentShader = [

                        customParams,

                        "#define PHONG",

                        "uniform vec3 diffuse;",
                        "uniform vec3 emissive;",
                        "uniform vec3 specular;",
                        "uniform float shininess;",
                        "uniform float opacity;",

                        THREE.ShaderChunk[ "common" ],
                        THREE.ShaderChunk[ "color_pars_fragment" ],
                        THREE.ShaderChunk[ "uv_pars_fragment" ],
                        THREE.ShaderChunk[ "uv2_pars_fragment" ],
                        THREE.ShaderChunk[ "map_pars_fragment" ],
                        THREE.ShaderChunk[ "alphamap_pars_fragment" ],
                        THREE.ShaderChunk[ "aomap_pars_fragment" ],
                        THREE.ShaderChunk[ "lightmap_pars_fragment" ],
                        THREE.ShaderChunk[ "emissivemap_pars_fragment" ],
                        THREE.ShaderChunk[ "envmap_pars_fragment" ],
                        THREE.ShaderChunk[ "fog_pars_fragment" ],
                        THREE.ShaderChunk[ "lights_phong_pars_fragment" ],
                        THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
                        THREE.ShaderChunk[ "bumpmap_pars_fragment" ],
                        THREE.ShaderChunk[ "normalmap_pars_fragment" ],
                        THREE.ShaderChunk[ "specularmap_pars_fragment" ],
                        THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ],

                        `
                        void main() {

                        `,
                        "   vec3 outgoingLight = vec3( 0.0 );",
                        "   vec4 diffuseColor = vec4( diffuse, opacity );",
                        "   vec3 totalAmbientLight = ambientLightColor;",
                        "   vec3 totalEmissiveLight = emissive;",

                        THREE.ShaderChunk[ "logdepthbuf_fragment" ],
                        THREE.ShaderChunk[ "map_fragment" ],
                        THREE.ShaderChunk[ "color_fragment" ],
                        THREE.ShaderChunk[ "specularmap_fragment" ],
                        THREE.ShaderChunk[ "lightmap_fragment" ],
                        THREE.ShaderChunk[ "aomap_fragment" ],
                        THREE.ShaderChunk[ "emissivemap_fragment" ],


                        THREE.ShaderChunk[ "lights_phong_fragment" ],

                        THREE.ShaderChunk[ "envmap_fragment" ],
                        THREE.ShaderChunk[ "shadowmap_fragment" ],

                        THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

                        THREE.ShaderChunk[ "fog_fragment" ],

                        customCode, // must set gl_FragColor!

                        // Really want this as the last step
                        THREE.ShaderChunk[ "alphamap_fragment" ],
                        THREE.ShaderChunk[ "alphatest_fragment" ],

                    "   gl_FragColor = vec4( outgoingLight, diffuseColor.a );",

                    "}"

                    ].join( "\n" );

                    return fragmentShader;

                },

                /**
                 * Generates a list of shaders for debugging.
                 * @return {string} all the shaders
                 */
                allShaders: function() {

                    return [

                        ShaderUtils.lambertShaderVertex(

                            ShaderUtils.buildingVertexShaderParams(),
                            ShaderUtils.buildingVertexShaderMain()

                        ),
                        ShaderUtils.lambertShaderFragment(

                            ShaderUtils.buildingFragmentShaderParams(),
                            ShaderUtils.buildingFragmentShaderMain()

                        ),
                        ShaderUtils.lambertShaderVertex(

                            ShaderUtils.terrainVertexShaderParams(),
                            ShaderUtils.terrainVertexShaderMain()

                        ),
                        ShaderUtils.lambertShaderFragment(

                            ShaderUtils.terrainFragmentShaderParams(),
                            ShaderUtils.terrainFragmentShaderMain()

                        ),

                        ShaderUtils.agentVertexShader(),
                        ShaderUtils.agentFragmentShader(),

                    ].join( "\n" )

                }
            }

        return FiercePlanet;

    }
)

