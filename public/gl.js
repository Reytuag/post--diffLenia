"use strict";

window.onload = init;

const canvas = document.getElementById("glCanvas");
const textbox = document.getElementById("showText");
const gl = canvas.getContext("webgl2", { antialias:false });
textbox.innerHTML = "initializing global...";

const url = new URL(window.location.href);
const isMobile = checkMobile();
const filename = getParam("file", "string", "lenia4", "lenia4");
const shadertoyFilename =  filename + ".glsl";  // error line number - 31
var randomSpecies = Math.floor(new Date().getSeconds() / 60 * 10); //Math.floor(Math.random() * 9);
var initSpecies = getParam("species", "int", randomSpecies, randomSpecies);
//const targetFPS = 60;
const stepsPerFrame = getParam("step", "int", 1, 1);
const useWindowSize = getParam("resize", "bool", false, true);
const useLogicalPixel = getParam("pixel", "bool", false, true);
const pixelSize = useLogicalPixel ? getParam("pixel", "int", 1, 5) : 1/(window.devicePixelRatio || 1);
// https://www.khronos.org/webgl/wiki/HandlingHighDPI
// https://mydevice.io

const glNotFoundRedirect = "https://caniuse.com/webgl2";
const canvasFilter = gl.LINEAR;  // gl.NEAREST or gl.LINEAR
const canvasWrap = gl.REPEAT;  // gl.REPEAT or gl.CLAMP_TO_EDGE

var width, height;
var simProgram, drawProgram;
var uniforms, params;
var imouseDrawLoca,zoomLoca,iResolutionLoca;
var framebufferA, framebufferB, textureA, textureB;
var frameFlip = false;

var pause = true;
var gen, frame;
var startTime;
var lastTime;
var lastFPSGen;
var lastFPSTime;
var actualFPS = 0;
var speciesName = "";

function setSpecies(species) {
  //gl.uniform1f(params.R, 12.);  // space resolution = kernel radius
  console.log(species);
  gl.useProgram(simProgram);
  switch (species) {
    case 0:
    speciesName = "VT049W fission";  // Tessellatium (sometimes reproductive)
    gl.uniform1f(params.T,7.25);
    gl.uniformMatrix4fv(params.b0, false, [0.995, 0.675, 0.675, 0.130, 0.090, 0.565, 0.795, 0.725, 0.635, 0.909, 0.0,0.0 , 0.0, 0.0, 0.1263, 0.0068] );  // kernel ring number
    gl.uniformMatrix4fv(params.b1, false, [0.330,0.195, 0.250, 0.405, 0.525, 0.495, 0.745, 0.025, 0.525, 0.300, 0.0,0.0 , 0.0, 0.0, 0.1345, 0.3537 ] );
    gl.uniformMatrix4fv(params.b2, false, [0.275, 0.730, 0.515, 0.800, 0.465, 0.353, 0.720, 0.615, 0.125, 0.672,  0.0,0.0 , 0.0, 0.0, 0.5695, 0.7907 ] );
    gl.uniformMatrix4fv(params.w0, false, [0.476, 0.207, 0.186, 0.021, 0.377, 0.174, 0.383, 0.220, 0.130, 0.122, 1., 1., 1., 1., 0.2602, 0.4109 ] );
    gl.uniformMatrix4fv(params.w1, false, [0.496, 0.322, 0.018, 0.343, 0.179, 0.095, 0.207, 0.493, 0.017, 0.417, 1., 1., 1., 1., 0.1362, 0.2186 ] );
    gl.uniformMatrix4fv(params.w2, false, [0.498, 0.344, 0.375, 0.303, 0.126, 0.074, 0.349, 0.043, 0.307, 0.210, 1., 1., 1., 1., 0.2717, 0.1765] );
    gl.uniformMatrix4fv(params.rk0,   false, [0.735, 0.017, 0.356, 0.011, 0.915, 0.727, 0.383, 0.095, 0.455, 0.671,  0.0,0.0 , 0.0, 0.0, 0.5257, 0.3147] );  // kernel ring heights
    gl.uniformMatrix4fv(params.rk1,   false, [0.027, 0.313, 0.668, 0.386, 0.678, 0.880, 0.755, 0.841, 0.186, 0.054,  0.0,0.0 , 0.0, 0.0, 0.9010, 0.1560] );
    gl.uniformMatrix4fv(params.rk2,   false, [0.284, 0.137, 0.605, 0.292, 0.875, 0.139, 0.490, 0.931, 0.782, 0.681,  0.0,0.0 , 0.0, 0.0, 0.0872, 0.7179] );
    gl.uniformMatrix4fv(params.mu,      false, [0.222, 0.149, 0.373, 0.356, 0.188, 0.155, 0.284, 0.134, 0.2890, 0.327,  0.0,0.0 , 0.0, 0.0, 0.1973, 0.2002] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0990, 0.0955, 0.0855, 0.0960, 0.0145, 0.0080, 0.0985, 0.0955, 0.0985, 0.0970,1., 1., 1., 1., 0.1543, 0.1587] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.222, 0.286, 0.098, 0.150, 0.38, 0.597, 0.391, 0.225, 0.319, 0.157,  0.0,0.0 , 0.0, 0.0, 0.3687, 0.4677 ] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.887, 0.516, 0.751, 0.893, 0.870, 0.995, 0.818, 0.326, 0.986, 0.716,1., 1., 1., 1., 0.7687, 0.4324] );  // relative kernel radius
    break;
    case 1:
    speciesName = "Z18A9R reproductive";  // Tessellatium (highly reproductive) (modified for lower reproduction)
    gl.uniform1f(params.T,7.5117);
    gl.uniformMatrix4fv(params.b0, false, [0.3500, 0.8950, 0.6000, 0.5450, 0.9200, 0.7000, 0.8450, 0.4800, 0.9650,0.7650, 0.0,0.0 , 0.0, 0.0, 0.1263, 0.0068] );  // kernel ring number
    gl.uniformMatrix4fv(params.b1, false, [0.1350, 0.3400, 0.6950, 0.5000, 0.0600, 0.7200, 0.0050, 1.0000, 0.8150,0.5850, 0.0,0.0 , 0.0, 0.0, 0.1345, 0.3537 ] );
    gl.uniformMatrix4fv(params.b2, false, [0.0500, 1.0000, 0.6100, 0.8650, 0.1750, 0.9000, 0.6700, 0.1400, 0.1450,0.1400,  0.0,0.0 , 0.0, 0.0, 0.5695, 0.7907 ] );
    gl.uniformMatrix4fv(params.w0, false, [0.1110, 0.2690, 0.4620, 0.0160, 0.0370, 0.0750, 0.0170, 0.3480, 0.1340,0.1100, 1., 1., 1., 1., 0.2602, 0.4109 ] );
    gl.uniformMatrix4fv(params.w1, false, [0.4910, 0.0120, 0.2970, 0.4170, 0.4420, 0.2650, 0.1320, 0.1780, 0.2960,0.0430, 1., 1., 1., 1., 0.1362, 0.2186 ] );
    gl.uniformMatrix4fv(params.w2, false, [0.3640, 0.1980, 0.3250, 0.2240, 0.3580, 0.2020, 0.0100, 0.4100, 0.2390,0.0110, 1., 1., 1., 1., 0.2717, 0.1765] );
    gl.uniformMatrix4fv(params.rk0,   false, [0.1150, 0.9410, 0.5390, 0.1990, 0.0250, 0.5040, 0.2980, 0.5210, 0.8040,0.0230,  0.0,0.0 , 0.0, 0.0, 0.5257, 0.3147] );  // kernel ring heights
    gl.uniformMatrix4fv(params.rk1,   false, [0.6420, 0.6850, 0.0860, 0.0000, 0.4780, 0.8120, 0.8460, 0.7600, 0.4370,0.9440,  0.0,0.0 , 0.0, 0.0, 0.9010, 0.1560] );
    gl.uniformMatrix4fv(params.rk2,   false, [0.4020, 0.9080, 0.2120, 0.4110, 0.3680, 0.6950, 0.0460, 0.4420, 0.5190,0.7860,  0.0,0.0 , 0.0, 0.0, 0.0872, 0.7179] );
    gl.uniformMatrix4fv(params.mu,      false, [0.1550, 0.4970, 0.1700, 0.2520, 0.2210, 0.4920, 0.4980, 0.1040, 0.1780,0.0510,  0.0,0.0 , 0.0, 0.0, 0.1973, 0.2002] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0995, 0.1115, 0.0660, 0.1670, 0.0890, 0.0190, 0.0645, 0.0050, 0.0310,0.0300,1., 1., 1., 1., 0.1543, 0.1587] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.2590, 0.0560, 0.0390, 0.4490, 0.1560, 0.1060, 0.1130, 0.4750, 0.1870,0.3420,  0.0,0.0 , 0.0, 0.0, 0.3687, 0.4677 ] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.7590, 0.6970, 0.2030, 0.8580, 0.7000, 0.5120, 0.5290, 0.9890, 0.7080,0.9980,1., 1., 1., 1., 0.7687, 0.4324] );  // relative kernel radius
    //gl.uniformMatrix4fv(params.sigma,   false, 0.0682, 0.1568, 0.034, 0.0484, 0.0816, 0.0376, 0.063, 0.1189, 0.1827, 0.1422, 0.1079, 0.0724, 0.0934, 0.1107, 0.0712, 1.] );  // growth width
    break;
    case 2:
    speciesName = "G6G6CR ciliates";  // Ciliatium (immune system) (modified for higher cilia production)
    gl.uniform1f(params.T,4.67);
    gl.uniformMatrix4fv(params.b0, false, [0.1250, 0.8150, 0.5050, 0.0900, 0.1300, 0.8250, 0.9750, 0.1400, 0.9000,0.9950, 0.0,0.0 , 0.0, 0.0, 0.1263, 0.0068] );  // kernel ring number
    gl.uniformMatrix4fv(params.b1, false, [0.6800, 0.7100, 0.9300, 0.3600, 0.1500, 0.3750, 0.2900, 0.8950, 0.5550,0.2200, 0.0,0.0 , 0.0, 0.0, 0.1345, 0.3537 ] );
    gl.uniformMatrix4fv(params.b2, false, [0.8100, 0.8700, 0.7600, 0.0050, 0.4500, 0.0150, 0.5300, 0.3950, 0.7050,0.0100,  0.0,0.0 , 0.0, 0.0, 0.5695, 0.7907 ] );
    gl.uniformMatrix4fv(params.w0, false, [0.3510, 0.2630, 0.1710, 0.0530, 0.0570, 0.1290, 0.2620, 0.0580, 0.0110,0.1650, 1., 1., 1., 1., 0.2602, 0.4109 ] );
    gl.uniformMatrix4fv(params.w1, false, [0.4030, 0.3380, 0.2500, 0.0290, 0.0100, 0.0200, 0.3110, 0.0760, 0.0110,0.2150, 1., 1., 1., 1., 0.1362, 0.2186 ] );
    gl.uniformMatrix4fv(params.w2, false, [0.0150, 0.3100, 0.0540, 0.3990, 0.2250, 0.4900, 0.4990, 0.0890, 0.0110,0.3590, 1., 1., 1., 1., 0.2717, 0.1765] );
    gl.uniformMatrix4fv(params.rk0,   false, [0.7980, 0.5880, 0.2040, 0.9410, 0.7750, 0.7040, 0.6980, 0.2080, 0.8890,0.1240,  0.0,0.0 , 0.0, 0.0, 0.5257, 0.3147] );  // kernel ring heights
    gl.uniformMatrix4fv(params.rk1,   false, [0.9860, 0.8950, 0.3110, 0.1290, 0.6220, 0.0450, 0.8770, 0.0940, 0.4150,0.9860,  0.0,0.0 , 0.0, 0.0, 0.9010, 0.1560] );
    gl.uniformMatrix4fv(params.rk2,   false, [0.3570, 0.9030, 0.8030, 0.7060, 0.0600, 0.3730, 0.2670, 0.2570, 0.0000,0.7930,  0.0,0.0 , 0.0, 0.0, 0.0872, 0.7179] );
    gl.uniformMatrix4fv(params.mu,      false, [0.1730, 0.1230, 0.3020, 0.4160, 0.0660, 0.4590, 0.3780, 0.1350, 0.3420,0.1930,  0.0,0.0 , 0.0, 0.0, 0.1973, 0.2002] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0145, 0.0140, 0.0915, 0.0410, 0.1695, 0.1715, 0.1540, 0.1675, 0.1080,0.1395,1., 1., 1., 1., 0.1543, 0.1587] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.3650, 0.3080, 0.0000, 0.1260, 0.2200, 0.2550, 0.2100, 0.2860, 0.2660,0.3420,  0.0,0.0 , 0.0, 0.0, 0.3687, 0.4677 ] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.7380, 0.9600, 0.2050, 0.4570, 0.2000, 0.5300, 0.5200, 0.2140, 0.5000,0.6290,1., 1., 1., 1., 0.7687, 0.4324] );  // relative kernel radius
    break;
    case 3:
    speciesName = "tri-color ghosts";
    gl.uniform1f(params.T,4.45);
    gl.uniformMatrix4fv(params.b0, false, [0.7082, 0.8403, 0.0711, 0.0051, 0.9114, 0.6402, 0.1446, 0.7150, 0.6682,0.0029,0.0,0.0 , 0.0, 0.0, 0.1263, 0.0068] );  // kernel ring number
    gl.uniformMatrix4fv(params.b1, false, [0.6035, 0.0101, 0.5291, 0.9359, 0.7906, 0.7790, 0.5333, 0.6888, 0.4874,0.1804, 0.0,0.0 , 0.0, 0.0, 0.1345, 0.3537 ] );
    gl.uniformMatrix4fv(params.b2, false, [0.6199, 0.8927, 0.3840, 0.9250, 0.2957, 0.1091, 0.5295, 0.2291, 0.8398,0.1621 ,  0.0,0.0 , 0.0, 0.0, 0.5695, 0.7907 ] );
    gl.uniformMatrix4fv(params.w0, false, [0.1654, 0.0105, 0.3522, 0.0729, 0.0849, 0.2849, 0.0189, 0.1269, 0.1104,0.0100 , 1., 1., 1., 1., 0.2602, 0.4109 ] );
    gl.uniformMatrix4fv(params.w1, false, [0.0100, 0.1868, 0.2147, 0.0170, 0.1461, 0.1167, 0.4996, 0.0372, 0.4320,0.1944 , 1., 1., 1., 1., 0.1362, 0.2186 ] );
    gl.uniformMatrix4fv(params.w2, false, [0.4989, 0.1386, 0.2967, 0.0426, 0.0836, 0.1651, 0.1817, 0.2290, 0.1478,0.1512, 1., 1., 1., 1., 0.2717, 0.1765]  );
    gl.uniformMatrix4fv(params.rk0,   false, [0.8369, 0.0390, 0.7392, 0.1371, 0.0288, 0.8752, 0.9324, 0.8954, 0.7233,0.4350,  0.0,0.0 , 0.0, 0.0, 0.5257, 0.3147] );  // kernel ring heights
    gl.uniformMatrix4fv(params.rk1,   false, [0.4729, 0.5165, 0.0048, 0.7887, 0.0893, 0.9156, 0.7814, 0.1141, 0.5061,0.9794,  0.0,0.0 , 0.0, 0.0, 0.9010, 0.1560] );
    gl.uniformMatrix4fv(params.rk2,   false, [0.3015, 0.9349, 0.5102, 0.8717, 0.0273, 0.8015, 0.1131, 0.1845, 0.8241,0.0472,  0.0,0.0 , 0.0, 0.0, 0.0872, 0.7179] );
    gl.uniformMatrix4fv(params.mu,      false, [0.2475, 0.4779, 0.1603, 0.4212, 0.1071, 0.2709, 0.1464, 0.1873, 0.2627,0.0780,  0.0,0.0 , 0.0, 0.0, 0.1973, 0.2002] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0580, 0.0933, 0.0876, 0.0464, 0.1768, 0.0502, 0.0670, 0.0339, 0.0666,0.1063,1., 1., 1., 1., 0.1543, 0.1587] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.2603, 0.3101, 0.0479, 0.1652, 0.2658, 0.2464, 0.4150, 0.4054, 0.3599,0.3027,  0.0,0.0 , 0.0, 0.0, 0.3687, 0.4677 ] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.7929, 0.4538, 0.9902, 0.4768, 0.2418, 0.6539, 0.3363, 0.8611, 0.7565,0.9465,1., 1., 1., 1., 0.7687, 0.4324]  );  // relative kernel radius
    break;

  }
}

function init() {
    textbox.innerHTML = "initializing window...";
    if (!gl) {
        alert('Could not initialize WebGL 2.0, try another browser');
        window.location.replace(glNotFoundRedirect);
        return;
    }
    gl.disable(gl.DEPTH_TEST);

    width = canvas.width;
    height = canvas.height;

    canvas.onmousedown = onMouseDown;
    canvas.onmousemove = onMouseMove;
    canvas.onmouseup   = onMouseUp;
    if (window.PointerEvent) {
        canvas.onpointerdown = onMouseDown;
        canvas.onpointermove = onMouseMove;
        canvas.onpointerup   = onMouseUp;
    } else {
        canvas.ontouchstart = onMouseDown;
        canvas.ontouchmove  = onMouseMove;
        canvas.ontouchend   = onMouseUp;
    }

    if (useWindowSize)
        window.onresize = onResize;

    textbox.innerHTML = "loading shader files...";
    loadShaderFiles(['vertex.glsl', 'fragment_sim.glsl', 'fragment_draw.glsl', shadertoyFilename],
        initWebGL);
}

function initWebGL(shaderSources) {
    textbox.innerHTML = "initializing simulation shader program...";
    var vertexSource = shaderSources[0];
    var simFragmentTemplate = shaderSources[1];
    var drawFragmentSource = shaderSources[2];
    var shadertoySource = shaderSources[3];
    var simFragmentSource = simFragmentTemplate
        .replace("/* Replace shader code here */", shadertoySource)
    //console.log(fragmentShaderSource);

    simProgram = createProgramFromSources(gl, vertexSource, simFragmentSource);
    gl.useProgram(simProgram);

    textbox.innerHTML = "initializing uniform variables...";
    uniforms = {
        iResolution:        gl.getUniformLocation(simProgram, "iResolution"),
        iTime:              gl.getUniformLocation(simProgram, "iTime"),
        iTimeDelta:         gl.getUniformLocation(simProgram, "iTimeDelta"),
        iFrame:             gl.getUniformLocation(simProgram, "iFrame"),
        iChannelTime:       gl.getUniformLocation(simProgram, "iChannelTime"),
        iChannelResolution: gl.getUniformLocation(simProgram, "iChannelResolution"),
        iMouse:             gl.getUniformLocation(simProgram, "iMouse"),
        iChannel0:          gl.getUniformLocation(simProgram, "iChannel0"),
        iChannel1:          gl.getUniformLocation(simProgram, "iChannel1"),
        iChannel2:          gl.getUniformLocation(simProgram, "iChannel2"),
        iChannel3:          gl.getUniformLocation(simProgram, "iChannel3"),
        iDate:              gl.getUniformLocation(simProgram, "iDate"),
        iFrameRate:         gl.getUniformLocation(simProgram, "iFrameRate"),
        color:              gl.getUniformLocation(simProgram, "color"),
        radius:              gl.getUniformLocation(simProgram, "radius")
  };
  params = {
    R:                gl.getUniformLocation(simProgram, "R"),
    T:                gl.getUniformLocation(simProgram, "T"),
    b0:              gl.getUniformLocation(simProgram, "b0"),
    b1:              gl.getUniformLocation(simProgram, "b1"),
    b2:              gl.getUniformLocation(simProgram, "b2"),
    w0:              gl.getUniformLocation(simProgram, "w0"),
    w1:              gl.getUniformLocation(simProgram, "w1"),
    w2:              gl.getUniformLocation(simProgram, "w2"),
    rk0:              gl.getUniformLocation(simProgram, "rk0"),
    rk1:              gl.getUniformLocation(simProgram, "rk1"),
    rk2:              gl.getUniformLocation(simProgram, "rk2"),
    mu:                 gl.getUniformLocation(simProgram, "mu"),
    sigma:              gl.getUniformLocation(simProgram, "sigma"),
    eta:                gl.getUniformLocation(simProgram, "eta"),
    relR:               gl.getUniformLocation(simProgram, "relR")
  };

    textbox.innerHTML = "initializing vertex shader...";
    var vertexArray = new Float32Array([
        -1,-1, +1,-1, -1,+1,  // first triangle
        -1,+1, +1,-1, +1,+1   // second triangle
    ]);
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

    var a_position = gl.getAttribLocation (simProgram, "a_position");
    gl.activeTexture(gl.TEXTURE0);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_position);

    resetTime();
    initUniforms();
    setUniforms();
    setSpecies(0);



    textbox.innerHTML = "initializing drawing shader program...";
    drawProgram = createProgramFromSources(gl, vertexSource, drawFragmentSource);
    iResolutionLoca=gl.getUniformLocation(drawProgram,"iResolution");
    onResize();
    gl.useProgram(drawProgram);
    imouseDrawLoca=gl.getUniformLocation(drawProgram,"iMouse");
    gl.uniform4f(imouseDrawLoca,0,0,-1,0)
    zoomLoca=gl.getUniformLocation(drawProgram,"zoom");
    gl.uniform1f(zoomLoca, 0.5);


    var draw_iChannel0 = gl.getUniformLocation(drawProgram, "iChannel0");
    gl.uniform1i(draw_iChannel0, 0);

    textbox.innerHTML = "finish initializing";
    runOnce();
}

function makeTexture(gl, width, height, data) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, canvasFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, canvasFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, canvasWrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, canvasWrap);

    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return [texture, framebuffer];
}

function makeRandomArray(rgba) {
    var numPixels = rgba.length/4;
    var probability = 0.25;
    for (var i=0;i<numPixels;i++) {
        var ii = i * 4;
        var state = Math.random() < probability ? 1 : 0;
        rgba[ii] = rgba[ii + 1] = rgba[ii + 2] = state ? 255 : 0;
        rgba[ii + 3] = 255;
    }
    return rgba;
}

function resetTime() {
    gen = 0;
    startTime = new Date();
    lastTime = new Date(startTime);
    lastFPSTime = new Date(startTime);
    lastFPSGen = 0;
}

function initUniforms() {
    gl.useProgram(simProgram);
    gl.uniform1i(uniforms.iChannel0, 0);
    gl.uniform1i(uniforms.iChannel1, 1);
    gl.uniform1i(uniforms.iChannel2, 2);
    gl.uniform1i(uniforms.iChannel3, 3);
    gl.uniform1f(uniforms.iSampleRate, 44100.0);
    gl.uniform4f(uniforms.iMouse, 0.0, 0.0, 0.0, 0.0);
    gl.uniform1f(params.R, 8.5);
    gl.uniform3f(uniforms.color, 1.0,0.0,0.0);
    gl.uniform1f(uniforms.radius, 0.5);

}

function setUniforms() {
    var now = new Date();
    var year = now.getFullYear();
    var month_minus1 = now.getMonth();
    var day_minus1 = now.getDate() - 1;
    var midnight = new Date(now).setHours(0, 0, 0, 0);
    var seconds = (now - midnight) / 1000;
    var elapsed = (now - startTime) / 1000;
    var delta = (now - lastTime) / 1000;

    var deltaFPSTime = (now - lastFPSTime) / 1000;
    if (gen == 0)
        actualFPS = 0;
    else if (deltaFPSTime >= 3) {
        actualFPS = (gen - lastFPSGen) / deltaFPSTime;
        lastFPSTime = now;
        lastFPSGen = gen;
    }

    gl.useProgram(simProgram);
    gl.uniform1i(uniforms.iFrame, gen);
    gl.uniform1f(uniforms.iTime, elapsed);
    gl.uniform1fv(uniforms.iChannelTime, [elapsed, elapsed, elapsed, elapsed]);
    gl.uniform1f(uniforms.iTimeDelta, delta);
    gl.uniform4f(uniforms.iDate, year, month_minus1, day_minus1, seconds);
    gl.uniform1f(uniforms.iFrameRate, actualFPS);

    lastTime = now;
}

function runOnce() {
    if (!pause) {
        gl.useProgram(simProgram);
        setUniforms();

        for (var step = 0; step < stepsPerFrame; step++) {
            frameFlip = !frameFlip;
            // read from frame (as texture), calculate and render to alternate frame (as framebuffer)
            gl.bindTexture(gl.TEXTURE_2D, frameFlip ? textureA : textureB);
            gl.bindFramebuffer(gl.FRAMEBUFFER, frameFlip ? framebufferB : framebufferA);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gen++;
        }

        // render the latest frame (as texture) to canvas (as framebuffer)
        gl.useProgram(drawProgram);
        gl.bindTexture(gl.TEXTURE_2D, frameFlip ? textureB : textureA);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        frame++;

        var status = width + "x" + height + " " + actualFPS.toFixed(1) + "fps";
        if (filename == "lenia4param") status += "</br>" + speciesName;
        textbox.innerHTML = status;
    }

    window.requestAnimationFrame(runOnce);
    //window.setTimeout(() => { window.requestAnimationFrame(runOnce) }, 1000/targetFPS);
}

function onResize(e) {
    if (!gl) return;

    if (useWindowSize) {
        width = Math.floor(canvas.clientWidth / pixelSize);
        height = Math.floor(canvas.clientHeight / pixelSize);
        canvas.width = width;
        canvas.height = height;
    } else {
        width = canvas.width;
        height = canvas.height;
        canvas.style.width = Math.ceil(width * pixelSize) + "px";
        canvas.style.height = Math.ceil(height * pixelSize) + "px";
    }

    //var newArray = new Uint8Array(width * height * 4);
    [textureA, framebufferA] = makeTexture(gl, width, height, null);  // makeRandomArray(newArray)
    [textureB, framebufferB] = makeTexture(gl, width, height, null);

    gl.viewport(0, 0, width, height);

    const ratio = 1.0;
    gl.useProgram(simProgram);
    gl.uniform2f(uniforms.iResolution, width, height);
    gl.uniform3fv(uniforms.iChannelResolution, [width,height,ratio, width,height,ratio, width,height,ratio, width,height,ratio]);
    gl.useProgram(drawProgram);
    gl.uniform2f(iResolutionLoca, width, height);
    resetTime();
}


var playButton=document.getElementById("play-pause");
playButton.onclick= ()=>{
  pause = ! pause;
  if(pause){
    document.getElementById("play").style.display="inline";
    document.getElementById("pause").style.display="none";
  }
  else{
    document.getElementById("play").style.display="none";
    document.getElementById("pause").style.display="inline";

  }

}
var resetButton=document.getElementById("reset");
resetButton.onclick=()=>{
  gen = 0;
}
var isMouseDown = false;
function set_iMouse(e, sx, sy) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
    var y =  canvas.height-(e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
    gl.useProgram(simProgram);
    gl.uniform4f(uniforms.iMouse, x, y, sx*x, sy*y);
}
function set_iMouseDraw(e, sx, sy) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
    var y =  canvas.height-(e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
    gl.useProgram(drawProgram);

    gl.uniform4f(imouseDrawLoca, x, y, sx*x, sy*y);
}

var buttonzoom = document.getElementById("radioZoom");
buttonzoom.onclick= ()=>{
  var instructionDisplay = document.getElementById("instructionDemo");
  instructionDisplay.innerHTML="Click and keep mouse down on screen to zoom. You can move a little bit to follow ";
}

function onMouseDown(e) { isMouseDown = true;  if(buttonzoom.checked){set_iMouseDraw(e, +1, +1)}else{set_iMouse(e,+1,+1)}; }
function onMouseMove(e) { if (isMouseDown)    if(buttonzoom.checked){set_iMouseDraw(e, +1, -1)}else{set_iMouse(e,+1,-1)}; }
function onMouseUp  (e) { isMouseDown = false; if(buttonzoom.checked){set_iMouseDraw(e, -1, -1)}else{set_iMouse(e,-1,-1)}; }



var sliderRadius = document.getElementById("rangeRadius");
var outputRadius = document.getElementById("valueRadius");
outputRadius.innerHTML = sliderRadius.value; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)

sliderRadius.oninput = function() {
outputRadius.innerHTML = this.value;
gl.useProgram(simProgram);
gl.uniform1f(gl.getUniformLocation(simProgram, "R"),this.value)
}


var sliderRadiusWall = document.getElementById("rangeRadiusWall");
var outputRadiusWall = document.getElementById("valueRadiusWall");
outputRadiusWall.innerHTML = sliderRadiusWall.value; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)

sliderRadiusWall.oninput = function() {
outputRadiusWall.innerHTML = this.value;
gl.useProgram(simProgram);
gl.uniform1f(gl.getUniformLocation(simProgram, "radius"), this.value);
}


var sliderZoom = document.getElementById("rangeZoom");
var outputZoom = document.getElementById("valueZoom");
outputZoom.innerHTML = sliderZoom.value;
sliderZoom.oninput = function() {
outputZoom.innerHTML = this.value;
gl.useProgram(drawProgram);
gl.uniform1f(zoomLoca, 1/this.value);
}

var buttonCrea = document.getElementById("radioCreature");
buttonCrea.onclick= ()=>{
  var instructionDisplay = document.getElementById("instructionDemo");
  instructionDisplay.innerHTML="Radius 0.5 is good to spawn creatures<br> Click on screen to spawn";
  gl.useProgram(simProgram);
  gl.uniform3f(gl.getUniformLocation(simProgram, "color"),1.0,0.0,0.0)
  //gl.uniform1f(gl.getUniformLocation(simProgram, "radius"), 0.5);
}
var buttonCircle = document.getElementById("radioCircle");
buttonCircle.onclick= ()=>{
  var instructionDisplay = document.getElementById("instructionDemo");
  instructionDisplay.innerHTML="Click on screen to add walls";
  gl.useProgram(simProgram);
  gl.uniform3f(gl.getUniformLocation(simProgram, "color"),0.0,0.0,1.0)

}

var buttonErase = document.getElementById("radioErase");
buttonErase.onclick= ()=>{
  var instructionDisplay = document.getElementById("instructionDemo");
  instructionDisplay.innerHTML="Click to erase";
  gl.useProgram(simProgram);
  gl.uniform3f(gl.getUniformLocation(simProgram, "color"),0.0,0.0,0.0)

}

var buttonAttract = document.getElementById("radioAttract");
buttonAttract.onclick= ()=>{
  var instructionDisplay = document.getElementById("instructionDemo");
  instructionDisplay.innerHTML="Click and keep mouse down and move (still experimental)";
  gl.useProgram(simProgram);
  gl.uniform3f(gl.getUniformLocation(simProgram, "color"),0.0,1.0,0.0)

}
