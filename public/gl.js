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

var pause = false;
var gen, frame;
var startTime;
var lastTime;
var lastFPSGen;
var lastFPSTime;
var actualFPS = 0;
var speciesName = "";

function setSpecies(species) {
  //gl.uniform1f(params.R, 12.);  // space resolution = kernel radius
  gl.uniform1f(params.T, 2.);  // time resolution = number of divisions per unit time
  switch (species) {
    case 0:
    speciesName = "VT049W fission";  // Tessellatium (sometimes reproductive)
    gl.uniform1f(params.baseNoise, 0.10);
    gl.uniformMatrix4fv(params.betaLen, false, [1., 1., 2., 2., 1., 2., 1., 1., 1., 2., 2., 2., 1., 2., 1., 0.] );  // kernel ring number
    gl.uniformMatrix4fv(params.beta0,   false, [1., 1., 1., 0., 1., 5./6., 1., 1., 1., 11./12., 3./4., 11./12., 1., 1./6., 1., 0.] );  // kernel ring heights
    gl.uniformMatrix4fv(params.beta1,   false, [0., 0., 1./4., 1., 0., 1., 0., 0., 0., 1., 1., 1., 0., 1., 0., 0.] );
    gl.uniformMatrix4fv(params.beta2,   false, [0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.mu,      false, [0.272, 0.349, 0.2, 0.114, 0.447, 0.247, 0.21, 0.462, 0.446, 0.327, 0.476, 0.379, 0.262, 0.412, 0.201, 0.] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0595, 0.1585, 0.0332, 0.0528, 0.0777, 0.0342, 0.0617, 0.1192, 0.1793, 0.1408, 0.0995, 0.0697, 0.0877, 0.1101, 0.0786, 1.] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.19, 0.66, 0.39, 0.38, 0.74, 0.92, 0.59, 0.37, 0.94, 0.51, 0.77, 0.92, 0.71, 0.59, 0.41, 0.] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.91, 0.62, 0.5, 0.97, 0.72, 0.8, 0.96, 0.56, 0.78, 0.79, 0.5, 0.72, 0.68, 0.55, 0.82, 1.] );  // relative kernel radius
    break;
    case 1:
    speciesName = "Z18A9R reproductive";  // Tessellatium (highly reproductive) (modified for lower reproduction)
    gl.uniform1f(params.baseNoise, 0.07);
    gl.uniformMatrix4fv(params.betaLen, false, [1., 1., 2., 2., 1., 2., 1., 1., 1., 2., 2., 2., 1., 2., 1., 0.] );  // kernel ring number
    gl.uniformMatrix4fv(params.beta0,   false, [1., 1., 1., 0., 1., 3./4., 1., 1., 1., 11./12., 3./4., 1., 1., 1./4., 1., 0.] );  // kernel ring heights
    gl.uniformMatrix4fv(params.beta1,   false, [0., 0., 1./4., 1., 0., 1., 0., 0., 0., 1., 1., 11./12., 0., 1., 0., 0.] );
    gl.uniformMatrix4fv(params.beta2,   false, [0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.mu,      false, [0.175, 0.382, 0.231, 0.123, 0.398, 0.224, 0.193, 0.512, 0.427, 0.286, 0.508, 0.372, 0.196, 0.371, 0.246, 0.] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0682, 0.1568, 0.034, 0.0484, 0.0816, 0.0376, 0.063, 0.1189, 0.1827, 0.1422, 0.1079, 0.0724, 0.0934, 0.1107, 0.0672, 1.] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.138, 0.544, 0.326, 0.256, 0.544, 0.544, 0.442, 0.198, 0.58, 0.282, 0.396, 0.618, 0.382, 0.374, 0.376, 0.] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.78, 0.56, 0.6, 0.84, 0.76, 0.82, 1.0, 0.68, 0.99, 0.72, 0.56, 0.65, 0.85, 0.54, 0.82, 1.] );  // relative kernel radius
    //gl.uniformMatrix4fv(params.sigma,   false, 0.0682, 0.1568, 0.034, 0.0484, 0.0816, 0.0376, 0.063, 0.1189, 0.1827, 0.1422, 0.1079, 0.0724, 0.0934, 0.1107, 0.0712, 1.] );  // growth width
    break;
    case 2:
    speciesName = "G6G6CR ciliates";  // Ciliatium (immune system) (modified for higher cilia production)
    gl.uniform1f(params.baseNoise, 0.09);
    gl.uniformMatrix4fv(params.betaLen, false, [1., 1., 1., 2., 1., 2., 1., 1., 1., 1., 1., 2., 1., 1., 2., 0.] );  // kernel ring number
    gl.uniformMatrix4fv(params.beta0,   false, [1., 1., 1., 1./12., 1., 5./6., 1., 1., 1., 1., 1., 1., 1., 1., 1., 0.] );  // kernel ring heights
    gl.uniformMatrix4fv(params.beta1,   false, [0., 0., 0., 1., 0., 1., 0., 0., 0., 0., 0., 11./12., 1., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.beta2,   false, [0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.mu,      false, [0.118, 0.174, 0.244, 0.114, 0.374, 0.222, 0.306, 0.449, 0.498, 0.295, 0.43, 0.353, 0.238, 0.39, 0.1, 0.] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0639, 0.159, 0.0287, 0.0469, 0.0822, 0.0294, 0.0775, 0.124, 0.1836, 0.1373, 0.0999, 0.0954, 0.0995, 0.1114, 0.0601, 1.] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.082, 0.462, 0.496, 0.27, 0.518, 0.576, 0.324, 0.306, 0.544, 0.374, 0.33, 0.528, 0.498, 0.43, 0.26, 0.] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.85, 0.61, 0.5, 0.81, 0.85, 0.93, 0.88, 0.74, 0.97, 0.92, 0.56, 0.56, 0.95, 0.59, 0.58, 1.] );  // relative kernel radius
    //gl.uniformMatrix4fv(params.sigma,   false, [0.0639, 0.159, 0.0287, 0.0469, 0.0822, 0.0294, 0.0775, 0.124, 0.1836, 0.1373, 0.0999, 0.0754, 0.0995, 0.1144, 0.0601, 1.] );  // growth width
    break;
    case 3:
    speciesName = "tri-color ghosts";
    gl.uniform1f(params.baseNoise, 0.08);
    gl.uniformMatrix4fv(params.betaLen, false, [2., 3., 1., 2., 3., 1., 2., 3., 1., 0., 0., 0., 0., 0., 0., 0.] );  // kernel ring number
    gl.uniformMatrix4fv(params.beta0,   false, [1./4., 1., 1., 1./4., 1., 1., 1./4., 1., 1., 0., 0., 0., 0., 0., 0., 0.] );  // kernel ring heights
    gl.uniformMatrix4fv(params.beta1,   false, [1., 3./4., 0., 1., 3./4., 0., 1., 3./4., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.beta2,   false, [0., 3./4., 0., 0., 3./4., 0., 0., 3./4., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.mu,      false, [0.16, 0.22, 0.28, 0.16, 0.22, 0.28, 0.16, 0.22, 0.28, 0., 0., 0., 0., 0., 0., 0.] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.025, 0.042, 0.025, 0.025, 0.042, 0.025, 0.025, 0.042, 0.025, 1., 1., 1., 1., 1., 1., 1.] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0., 0., 0., 0., 0., 0., 0.] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1., 1.] );  // relative kernel radius
    break;
    case 4:
    speciesName = "KH97WU courting";  // Tessellatium (courting, slightly reproductive)";
    gl.uniform1f(params.baseNoise, 0.14);
    gl.uniformMatrix4fv(params.betaLen, false, [1., 1., 2., 2., 1., 2., 1., 1., 1., 2., 2., 1., 1., 2., 1., 0.] );  // kernel ring number
    gl.uniformMatrix4fv(params.beta0,   false, [1., 1., 1., 0., 1., 5./6., 1., 1., 1., 11./12., 3./4., 1., 1., 1./6., 1., 0.] );  // kernel ring heights
    gl.uniformMatrix4fv(params.beta1,   false, [0., 0., 1./4., 1., 0., 1., 0., 0., 0., 1., 1., 0., 0., 1., 0., 0.] );
    gl.uniformMatrix4fv(params.beta2,   false, [0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.mu,      false, [0.204, 0.359, 0.176, 0.128, 0.386, 0.229, 0.181, 0.466, 0.466, 0.37, 0.447, 0.391, 0.299, 0.398, 0.183, 0.] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0574, 0.152, 0.0314, 0.0545, 0.0825, 0.0348, 0.0657, 0.1224, 0.1789, 0.1372, 0.1064, 0.0644, 0.0891, 0.1065, 0.0773, 1.] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.116, 0.448, 0.332, 0.392, 0.398, 0.614, 0.448, 0.224, 0.624, 0.352, 0.342, 0.634, 0.362, 0.472, 0.242, 0.] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.93, 0.59, 0.58, 0.97, 0.79, 0.87, 1.0, 0.64, 0.67, 0.68, 0.5, 0.85, 0.69, 0.87, 0.66, 1.] );  // relative kernel radius
    break;
    case 5:
    speciesName = "XEH4YR explosive";  // Tessellatium (explosive)";
    gl.uniform1f(params.baseNoise, 0.10);
    gl.uniformMatrix4fv(params.betaLen, false, [1., 1., 2., 2., 1., 2., 1., 1., 1., 2., 2., 2., 1., 3., 1., 0.] );  // kernel ring number
    gl.uniformMatrix4fv(params.beta0,   false, [1., 1., 1., 0., 1., 5./6., 1., 1., 1., 11./12., 3./4., 11./12., 1., 1./6., 1., 0.] );  // kernel ring heights
    gl.uniformMatrix4fv(params.beta1,   false, [0., 0., 1./4., 1., 0., 1., 0., 0., 0., 1., 1., 1., 0., 1., 0., 0.] );
    gl.uniformMatrix4fv(params.beta2,   false, [0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.mu,      false, [0.282, 0.354, 0.197, 0.164, 0.406, 0.251, 0.259, 0.517, 0.455, 0.264, 0.472, 0.417, 0.208, 0.395, 0.184, 0.] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0646, 0.1584, 0.0359, 0.056, 0.0738, 0.0383, 0.0665, 0.1164, 0.1806, 0.1437, 0.0939, 0.0666, 0.0815, 0.1049, 0.0748, 1.] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.082, 0.544, 0.26, 0.294, 0.508, 0.56, 0.326, 0.21, 0.638, 0.346, 0.384, 0.748, 0.44, 0.366, 0.294, 0.] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.85, 0.62, 0.69, 0.84, 0.82, 0.86, 1.0, 0.5, 0.78, 0.6, 0.5, 0.7, 0.67, 0.6, 0.8, 1.] );  // relative kernel radius
    break;
    case 6:
    speciesName = "HAESRE zigzagging";  // Tessellatium (zigzaging)";
    gl.uniform1f(params.baseNoise, 0.13);
    gl.uniformMatrix4fv(params.betaLen, false, [1., 1., 2., 2., 1., 2., 1., 1., 1., 2., 2., 2., 1., 2., 1., 0.] );  // kernel ring number
    gl.uniformMatrix4fv(params.beta0,   false, [1., 1., 1., 0., 1., 3./4., 1., 1., 1., 11./12., 5./6., 1., 1., 1./4., 1., 0.] );  // kernel ring heights
    gl.uniformMatrix4fv(params.beta1,   false, [0., 0., 1./4., 1., 0., 1., 0., 0., 0., 1., 1., 11./12., 0., 1., 0., 0.] );
    gl.uniformMatrix4fv(params.beta2,   false, [0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.mu,      false, [0.272, 0.337, 0.129, 0.132, 0.429, 0.239, 0.25, 0.497, 0.486, 0.276, 0.425, 0.352, 0.21, 0.381, 0.244, 0.] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.0674, 0.1576, 0.0382, 0.0514, 0.0813, 0.0409, 0.0691, 0.1166, 0.1751, 0.1344, 0.1026, 0.0797, 0.0921, 0.1056, 0.0813, 1.] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.15, 0.474, 0.342, 0.192, 0.524, 0.598, 0.426, 0.348, 0.62, 0.338, 0.314, 0.608, 0.292, 0.426, 0.346, 0.] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.87, 0.65, 0.67, 0.98, 0.77, 0.83, 1.0, 0.7, 0.99, 0.69, 0.7, 0.57, 0.89, 0.84, 0.76, 1.] );  // relative kernel radius
    break;
    case 7:
    speciesName = "GDNQYX variety";  // Tessellatium (stable)";
    gl.uniform1f(params.baseNoise, 0.13);
    gl.uniformMatrix4fv(params.betaLen, false, [1., 1., 2., 2., 1., 2., 1., 1., 1., 2., 2., 2., 1., 2., 1., 0.] );  // kernel ring number
    gl.uniformMatrix4fv(params.beta0,   false, [1., 1., 1., 0., 1., 5./6., 1., 1., 1., 11./12., 3./4., 1., 1., 1./6., 1., 0.] );  // kernel ring heights
    gl.uniformMatrix4fv(params.beta1,   false, [0., 0., 1./4., 1., 0., 1., 0., 0., 0., 1., 1., 11./12., 0., 1., 0., 0.] );
    gl.uniformMatrix4fv(params.beta2,   false, [0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.mu,      false, [0.242, 0.375, 0.194, 0.122, 0.413, 0.221, 0.192, 0.492, 0.426, 0.361, 0.464, 0.361, 0.235, 0.381, 0.216, 0.] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.061, 0.1553, 0.0361, 0.0531, 0.0774, 0.0365, 0.0649, 0.1219, 0.1759, 0.1381, 0.1044, 0.0686, 0.0924, 0.1118, 0.0748, 1.] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.144, 0.506, 0.332, 0.3, 0.502, 0.58, 0.344, 0.268, 0.582, 0.326, 0.418, 0.642, 0.39, 0.378, 0.294, 0.] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.98, 0.59, 0.5, 0.93, 0.73, 0.88, 0.93, 0.61, 0.84, 0.7, 0.57, 0.73, 0.74, 0.87, 0.72, 1.] );  // relative kernel radius
    break;
    case 8:
    speciesName = "Y3CS55 emitter";  // Papillatium (fast emitter)";
    gl.uniform1f(params.baseNoise, 0.10);
    gl.uniformMatrix4fv(params.betaLen, false, [1., 1., 1., 2., 1., 2., 1., 1., 1., 1., 1., 3., 1., 1., 2., 0.] );  // kernel ring number
    gl.uniformMatrix4fv(params.beta0,   false, [1., 1., 1., 1./12., 1., 5./6., 1., 1., 1., 1., 1., 1., 1., 1., 1., 0.] );  // kernel ring heights
    gl.uniformMatrix4fv(params.beta1,   false, [0., 0., 0., 1., 0., 1., 0., 0., 0., 0., 0., 11./12., 0., 0., 1./12., 0.] );
    gl.uniformMatrix4fv(params.beta2,   false, [0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
    gl.uniformMatrix4fv(params.mu,      false, [0.168, 0.1, 0.265, 0.111, 0.327, 0.223, 0.293, 0.465, 0.606, 0.404, 0.377, 0.297, 0.319, 0.483, 0.1, 0.] );  // growth center
    gl.uniformMatrix4fv(params.sigma,   false, [0.062, 0.1495, 0.0488, 0.0555, 0.0763, 0.0333, 0.0724, 0.1345, 0.1807, 0.1413, 0.1136, 0.0701, 0.1038, 0.1185, 0.0571, 1.] );  // growth width
    gl.uniformMatrix4fv(params.eta,     false, [0.076, 0.562, 0.548, 0.306, 0.568, 0.598, 0.396, 0.298, 0.59, 0.396, 0.156, 0.426, 0.558, 0.388, 0.132, 0.] );  // growth strength
    gl.uniformMatrix4fv(params.relR,    false, [0.58, 0.68, 0.5, 0.87, 1.0, 1.0, 0.88, 0.88, 0.86, 0.98, 0.63, 0.53, 1.0, 0.89, 0.59, 1.] );  // relative kernel radius
    break;
    case 9:
        speciesName = "F45LYC cloud";
    gl.uniform1f(params.baseNoise, 0.09);
        gl.uniformMatrix4fv(params.betaLen, false, [3., 2., 1., 3., 2., 1., 3., 2., 1., 2., 1., 1., 2., 2., 1., 0.] );  // kernel ring number
        gl.uniformMatrix4fv(params.beta0,   false, [1., 2./3., 1., 1., 5./12., 1., 1., 1./6., 1., 1./6., 1., 1., 7./12., 1./4., 1., 0.] );  // kernel ring heights
        gl.uniformMatrix4fv(params.beta1,   false, [1./4., 1., 0., 1./12., 1., 0., 1./12., 1., 0., 1., 0., 0., 1., 1., 0., 0.] );
        gl.uniformMatrix4fv(params.beta2,   false, [11./12., 0., 0., 2./3., 0., 0., 7./12., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
        gl.uniformMatrix4fv(params.mu,      false, [0.151, 0.217, 0.249, 0.358, 0.243, 0.463, 0.145, 0.181, 0.31, 0.116, 0.326, 0.68, 0.276, 0.242, 0.119, 0.] );  // growth center
        gl.uniformMatrix4fv(params.sigma,   false, [0.0176, 0.0693, 0.0606, 0.025, 0.0752, 0.112, 0.01, 0.0844, 0.0847, 0.0602, 0.087, 0.1145, 0.0671, 0.035, 0.0922, 1.] );  // growth width
        gl.uniformMatrix4fv(params.eta,     false, [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.] );  // growth strength
        gl.uniformMatrix4fv(params.relR,    false, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.] );  // relative kernel radius
    break;
    case 10:
        speciesName = "F45LYC cloud";
    gl.uniform1f(params.baseNoise, 0.19);
        gl.uniformMatrix4fv(params.betaLen, false, [3., 2., 1., 3., 2., 1., 3., 2., 1., 2., 1., 1., 2., 2., 1., 0.] );  // kernel ring number
        gl.uniformMatrix4fv(params.beta0,   false, [1., 2./3., 1., 1., 5./12., 1., 1., 1./6., 1., 1./6., 1., 1., 7./12., 1./4., 1., 0.] );  // kernel ring heights
        gl.uniformMatrix4fv(params.beta1,   false, [1./4., 1., 0., 1./12., 1., 0., 1./12., 1., 0., 1., 0., 0., 1., 1., 0., 0.] );
        gl.uniformMatrix4fv(params.beta2,   false, [11./12., 0., 0., 2./3., 0., 0., 7./12., 0., 0., 0., 0., 0., 0., 0., 0., 0.] );
        gl.uniformMatrix4fv(params.mu,      false, [0.151, 0.217, 0.249, 0.358, 0.243, 0.463, 0.145, 0.181, 0.31, 0.116, 0.326, 0.68, 0.276, 0.242, 0.119, 0.] );  // growth center
        gl.uniformMatrix4fv(params.sigma,   false, [0.0176, 0.0693, 0.0606, 0.025, 0.0752, 0.112, 0.01, 0.0844, 0.0847, 0.0602, 0.087, 0.1145, 0.0671, 0.035, 0.0922, 1.] );  // growth width
        gl.uniformMatrix4fv(params.eta,     false, [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.65, 0.] );  // growth strength
        gl.uniformMatrix4fv(params.relR,    false, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.] );  // relative kernel radius
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
    window.onkeypress = onKeyPress;

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
        R:                  gl.getUniformLocation(simProgram, "R"),
        color:              gl.getUniformLocation(simProgram, "color"),
        radius:              gl.getUniformLocation(simProgram, "radius")
  };
  if (initSpecies != null) {
    params = {

      T:                  gl.getUniformLocation(simProgram, "T"),
      baseNoise:          gl.getUniformLocation(simProgram, "baseNoise"),
      betaLen:            gl.getUniformLocation(simProgram, "betaLen"),
      beta0:              gl.getUniformLocation(simProgram, "beta0"),
      beta1:              gl.getUniformLocation(simProgram, "beta1"),
      beta2:              gl.getUniformLocation(simProgram, "beta2"),
      mu:                 gl.getUniformLocation(simProgram, "mu"),
      sigma:              gl.getUniformLocation(simProgram, "sigma"),
      eta:                gl.getUniformLocation(simProgram, "eta"),
      relR:               gl.getUniformLocation(simProgram, "relR")
    };
  }

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
    setSpecies(initSpecies);



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
    gl.uniform1f(uniforms.R, 8.5);
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

function onKeyPress(e) {
    switch (e.key) {
        case "p": pause = ! pause; break;
    }
    switch (e.keyCode) {
        case 13: pause = false;gen = 0; break;
    }
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
