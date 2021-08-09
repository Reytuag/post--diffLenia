#version 300 es
// Simulator Fragment shader template ("Buffer A" tab in Shadertoy), replace %s with Shadertoy or Smoothstep.io code
// https://shadertoyunofficial.wordpress.com/2016/07/20/special-shadertoy-features/
precision highp float;
#define HW_PERFORMANCE 0

// emulate Shadertoy
#define iGlobalTime iTime

uniform vec2      iResolution;           // viewport resolution (in pixels)
uniform float     iTime;                 // shader playback time (in seconds)
uniform float     iTimeDelta;            // render time (in seconds)
uniform int       iFrame;                // shader playback frame
uniform float     iChannelTime[4];       // channel playback time (in seconds)
uniform vec3      iChannelResolution[4]; // channel resolution (in pixels)
uniform vec4      iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
uniform sampler2D iChannel0;             // input channel 0
uniform sampler2D iChannel1;             // input channel 1
uniform sampler2D iChannel2;             // input channel 2
uniform sampler2D iChannel3;             // input channel 3
uniform vec4      iDate;                 // (year, month, day, time in seconds)
uniform float     iSampleRate;           // sound sample rate (i.e., 44100)
uniform float     iFrameRate;            // average FPS

// emulate Smoothstep.io
#define iPrevFrame iChannel0

out vec4 fragColor;

/* Beginning of Shadertoy/Smoothstep.io code */

/* Replace shader code here */

/* End of Shadertoy/Smoothstep.io code */

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
