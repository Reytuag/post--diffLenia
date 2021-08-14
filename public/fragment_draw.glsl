#version 300 es
// Image Drawing Fragment shader template ("Image" tab in Shadertoy)
precision highp float;

uniform vec4 iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
uniform sampler2D iChannel0;             // input channel 0
uniform vec2  iResolution;
uniform float zoom;
out vec4 fragColor;

void main() {
  if(iMouse[2]<0.){
    fragColor = texelFetch(iChannel0, ivec2(gl_FragCoord), 0);

  }
  else{
    fragColor = texelFetch(iChannel0, ivec2(mod(((gl_FragCoord.xy-vec2(iResolution.x,iResolution.y)/2.0)*zoom+vec2(iMouse[0],iMouse[1])),vec2(iResolution.x,iResolution.y))), 0);
  }
  fragColor[2]=fragColor[2]+fragColor[1];
  fragColor[1]=fragColor[1]+fragColor[0];
}
