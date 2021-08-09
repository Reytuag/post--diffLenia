// maximum 16 kernels by using 4x4 matrix
// when matrix operation not available (e.g. exp, mod, equal, /), split into four vec4 operations

#define EPSILON 0.000001
#define mult matrixCompMult

// change to other numbers (with nearest or linear filter in Buffer A) for funny effects :)
const float samplingDist = 1.;
// 1:normal, int>1:heavy phantom,
// 0.1-0.2:dots, 0.3-0.9:smooth zoom out, 1.1-1.8,2.2-2.8:smooth zoom in,
// 1.9,2.1,2.9,3.1,3.9(near int):partial phantom, >=3.2:minor glitch, increase as larger
// linear filter: smoother, nearest filter: more glitch/phantom

uniform vec3 color;
uniform float radius;
uniform vec2 translation;
// choose a species (0 to 9)
#define species7

const ivec4 iv0 = ivec4(0);
const ivec4 iv1 = ivec4(1);
const ivec4 iv2 = ivec4(2);
const ivec4 iv3 = ivec4(3);
const vec4 v0 = vec4(0.);
const vec4 v1 = vec4(1.);
const mat4 m0 = mat4(v0, v0, v0, v0);
const mat4 m1 = mat4(v1, v1, v1, v1);

const float baseNoise = 0.1;
uniform float R;  // space resolution = kernel radius
  // time resolution = number of divisions per unit time

const float T = 7.25;
const mat4      b0 = mat4( 0.995, 0.675, 0.675, 0.130, 0.090, 0.565, 0.795, 0.725, 0.635, 0.909, 0.0,0.0 , 0.0, 0.0, 0.1263, 0.0068);  // kernel ring heights
const mat4      b1 = mat4( 0.330,0.195, 0.250, 0.405, 0.525, 0.495, 0.745, 0.025, 0.525, 0.300, 0.0,0.0 , 0.0, 0.0, 0.1345, 0.3537 );
const mat4      b2 = mat4( 0.275, 0.730, 0.515, 0.800, 0.465, 0.353, 0.720, 0.615, 0.125, 0.672,  0.0,0.0 , 0.0, 0.0, 0.5695, 0.7907 );
const mat4      w0 = mat4( 0.476, 0.207, 0.186, 0.021, 0.377, 0.174, 0.383, 0.220, 0.130, 0.122, 1., 1., 1., 1., 0.2602, 0.4109 );  // kernel ring heights
const mat4      w1 = mat4( 0.496, 0.322, 0.018, 0.343, 0.179, 0.095, 0.207, 0.493, 0.017, 0.417, 1., 1., 1., 1., 0.1362, 0.2186 );
const mat4      w2 = mat4( 0.498, 0.344, 0.375, 0.303, 0.126, 0.074, 0.349, 0.043, 0.307, 0.210, 1., 1., 1., 1., 0.2717, 0.1765);
const mat4      rk0 = mat4( 0.735, 0.017, 0.356, 0.011, 0.915, 0.727, 0.383, 0.095, 0.455, 0.671,  0.0,0.0 , 0.0, 0.0, 0.5257, 0.3147 );   // kernel ring heights
const mat4      rk1 = mat4( 0.027, 0.313, 0.668, 0.386, 0.678, 0.880, 0.755, 0.841, 0.186, 0.054,  0.0,0.0 , 0.0, 0.0, 0.9010, 0.1560 );
const mat4      rk2 = mat4( 0.284, 0.137, 0.605, 0.292, 0.875, 0.139, 0.490, 0.931, 0.782, 0.681,  0.0,0.0 , 0.0, 0.0, 0.0872, 0.7179 );
const mat4         mu = mat4( 0.222, 0.149, 0.373, 0.356, 0.188, 0.155, 0.284, 0.134, 0.2890, 0.327,  0.0,0.0 , 0.0, 0.0, 0.1973, 0.2002 );   // growth center
const mat4      sigma = mat4( 0.0990, 0.0955, 0.0855, 0.0960, 0.0145, 0.0080, 0.0985, 0.0955, 0.0985, 0.0970,1., 1., 1., 1., 0.1543, 0.1587 );  // growth width
const mat4        eta = mat4( 0.222, 0.286, 0.098, 0.150, 0.38, 0.597, 0.391, 0.225, 0.319, 0.157,  0.0,0.0 , 0.0, 0.0, 0.3687, 0.4677 );   // growth strength
const mat4       relR = mat4( 0.887, 0.516, 0.751, 0.893, 0.870, 0.995, 0.818, 0.326, 0.986, 0.716,1., 1., 1., 1., 0.7687, 0.4324 );  // relative kernel radius
const mat4        src = mat4( 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.,  0.0,0.0 , 0.0, 0.0, 1, 1 );   // source channels
const mat4        dst = mat4( 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.,  0.0,0.0 , 0.0, 0.0, 0, 0 );   // destination channels
/*


const float T = 7.25;
const mat4      b0 = mat4( 0.995, 0.675, 0.675, 0.130, 0.090, 0.565, 0.795, 0.725, 0.635, 0.909, 0.0,0.0 , 0.0, 0.0, 0.1263, 0.0068);  // kernel ring heights
const mat4      b1 = mat4( 0.330,0.195, 0.250, 0.405, 0.525, 0.495, 0.745, 0.025, 0.525, 0.300, 0.0,0.0 , 0.0, 0.0, 0.1345, 0.3537 );
const mat4      b2 = mat4( 0.275, 0.730, 0.515, 0.800, 0.465, 0.353, 0.720, 0.615, 0.125, 0.672,  0.0,0.0 , 0.0, 0.0, 0.5695, 0.7907 );
const mat4      w0 = mat4( 0.476, 0.207, 0.186, 0.021, 0.377, 0.174, 0.383, 0.220, 0.130, 0.122, 1., 1., 1., 1., 0.2602, 0.4109 );  // kernel ring heights
const mat4      w1 = mat4( 0.496, 0.322, 0.018, 0.343, 0.179, 0.095, 0.207, 0.493, 0.017, 0.417, 1., 1., 1., 1., 0.1362, 0.2186 );
const mat4      w2 = mat4( 0.498, 0.344, 0.375, 0.303, 0.126, 0.074, 0.349, 0.043, 0.307, 0.210, 1., 1., 1., 1., 0.2717, 0.1765);
const mat4      rk0 = mat4( 0.735, 0.017, 0.356, 0.011, 0.915, 0.727, 0.383, 0.095, 0.455, 0.671,  0.0,0.0 , 0.0, 0.0, 0.5257, 0.3147 );   // kernel ring heights
const mat4      rk1 = mat4( 0.027, 0.313, 0.668, 0.386, 0.678, 0.880, 0.755, 0.841, 0.186, 0.054,  0.0,0.0 , 0.0, 0.0, 0.9010, 0.1560 );
const mat4      rk2 = mat4( 0.284, 0.137, 0.605, 0.292, 0.875, 0.139, 0.490, 0.931, 0.782, 0.681,  0.0,0.0 , 0.0, 0.0, 0.0872, 0.7179 );
const mat4         mu = mat4( 0.222, 0.149, 0.373, 0.356, 0.188, 0.155, 0.284, 0.134, 0.2890, 0.327,  0.0,0.0 , 0.0, 0.0, 0.1973, 0.2002 );   // growth center
const mat4      sigma = mat4( 0.0990, 0.0955, 0.0855, 0.0960, 0.0145, 0.0080, 0.0985, 0.0955, 0.0985, 0.0970,1., 1., 1., 1., 0.1443, 0.1567 );  // growth width
const mat4        eta = mat4( 0.222, 0.286, 0.098, 0.150, 0.38, 0.597, 0.391, 0.225, 0.319, 0.157,  0.0,0.0 , 0.0, 0.0, 0.3687, 0.4677 );   // growth strength
const mat4       relR = mat4( 0.887, 0.516, 0.751, 0.893, 0.870, 0.995, 0.818, 0.326, 0.986, 0.716,1., 1., 1., 1., 0.7687, 0.4324 );  // relative kernel radius
const mat4        src = mat4( 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.,  0.0,0.0 , 0.0, 0.0, 1, 1 );   // source channels
const mat4        dst = mat4( 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.,  0.0,0.0 , 0.0, 0.0, 0, 0 );   // destination channels
//glider
const float T = 12.;
const mat4      b0 = mat4( 1., 0.675, 0.675, 0.130, 0.090, 0.565, 0.795, 0.725, 0.635, 0.909, 0.0,0.0 , 0.0, 0.0, 0.0, 0.0 );  // kernel ring heights
const mat4      b1 = mat4( 0.,0.195, 0.250, 0.405, 0.525, 0.495, 0.745, 0.025, 0.525, 0.300, 0.0,0.0 , 0.0, 0.0, 0.0, 0.0 );
const mat4      b2 = mat4( 0., 0.730, 0.515, 0.800, 0.465, 0.353, 0.720, 0.615, 0.125, 0.672,  0.0,0.0 , 0.0, 0.0, 0.0, 0.0 );
const mat4      w0 = mat4( 0.17, 0.207, 0.186, 0.021, 0.377, 0.174, 0.383, 0.220, 0.130, 0.122, 1., 1., 1., 1., 1., 1. );  // kernel ring heights
const mat4      w1 = mat4( 1., 0.322, 0.018, 0.343, 0.179, 0.095, 0.207, 0.493, 0.017, 0.417, 1., 1., 1., 1., 1., 1. );
const mat4      w2 = mat4( 1., 0.344, 0.375, 0.303, 0.126, 0.074, 0.349, 0.043, 0.307, 0.210, 1., 1., 1., 1., 1., 1. );
const mat4      rk0 = mat4( 0.5, 0.017, 0.356, 0.011, 0.915, 0.727, 0.383, 0.095, 0.455, 0.671,  0.0,0.0 , 0.0, 0.0, 0.0, 0.0 );   // kernel ring heights
const mat4      rk1 = mat4( 0.0, 0.313, 0.668, 0.386, 0.678, 0.880, 0.755, 0.841, 0.186, 0.054,  0.0,0.0 , 0.0, 0.0, 0.0, 0.0 );
const mat4      rk2 = mat4( 0.0, 0.137, 0.605, 0.292, 0.875, 0.139, 0.490, 0.931, 0.782, 0.681,  0.0,0.0 , 0.0, 0.0, 0.0, 0.0 );
const mat4         mu = mat4( 0.15, 0.149, 0.373, 0.356, 0.188, 0.155, 0.284, 0.134, 0.2890, 0.327,  0.0,0.0 , 0.0, 0.0, 0.0, 0.0 );   // growth center
const mat4      sigma = mat4( 0.015, 0.0955, 0.0855, 0.0960, 0.0145, 0.0080, 0.0985, 0.0955, 0.0985, 0.0970,1., 1., 1., 1., 1., 1. );  // growth width
const mat4        eta = mat4( 1., 0.0, 0.0, 0.0, 0.0,0.0 , 0.0, 0.0, 0.0, 0.0 ,  0.0,0.0 , 0.0, 0.0, 0.0, 0.0 );   // growth strength
const mat4       relR = mat4( 1., 0.516, 0.751, 0.893, 0.870, 0.995, 0.818, 0.326, 0.986, 0.716,1., 1., 1., 1., 1., 1. );  // relative kernel radius
const mat4        src = mat4( 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.,  0.0,0.0 , 0.0, 0.0, 0.0, 2.0 );   // source channels
const mat4        dst = mat4( 0., 0., 0., 0., 0., 0., 0., 0., 0., 0.,  0.0,0.0 , 0.0, 0.0, 0.0, 0.0 );   // destination channels
*/
const mat4 relRinv=1.0/relR;

// precalculate

const float dt = 1./T;       // time step

const vec4 kmv = vec4(0.5);    // kernel ring center
const mat4 kmu = mat4(kmv, kmv, kmv, kmv);
const vec4 ksv = vec4(0.15);    // kernel ring width
const mat4 ksigma = mat4(ksv, ksv, ksv, ksv);

const ivec4 src0 = ivec4(src[0]), src1 = ivec4(src[1]), src2 = ivec4(src[2]), src3 = ivec4(src[3]);
const ivec4 dst0 = ivec4(dst[0]), dst1 = ivec4(dst[1]), dst2 = ivec4(dst[2]), dst3 = ivec4(dst[3]);


// Noise simplex 2D by iq - https://www.shadertoy.com/view/Msf3WH

vec2 hash( vec2 p )
{
	p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise( in vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

	vec2  i = floor( p + (p.x+p.y)*K1 );
    vec2  a = p - i + (i.x+i.y)*K2;
    float m = step(a.y,a.x);
    vec2  o = vec2(m,1.0-m);
    vec2  b = a - o + K2;
	vec2  c = a - 1.0 + 2.0*K2;
    vec3  h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
	vec3  n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot( n, vec3(70.0) );
}

// code forked from https://www.shadertoy.com/view/7lsGDr#


// Noise simplex 2D by iq - https://www.shadertoy.com/view/Msf3WH



// modified from SmoothLife by davidar - https://www.shadertoy.com/view/Msy3RD

// bell-shaped curve (Gaussian bump)
mat4 bell(in mat4 x, in mat4 m, in mat4 s)
{
    mat4 v = -mult(x-m, x-m) / s / s / 2.;
    return mat4( exp(v[0]), exp(v[1]), exp(v[2]), exp(v[3]) );
}
mat4 bell2(in mat4 x, in mat4 m, in mat4 w)
{
    mat4 v = -mult(x-m, x-m) / w;
    return mat4( exp(v[0]), exp(v[1]), exp(v[2]), exp(v[3]) );
}
mat4 sigmoid(in mat4 x)
{
    return mat4( 1.0/(1.0+exp(-x[0])),  1.0/(1.0+exp(-x[1])),  1.0/(1.0+exp(-x[2])),  1.0/(1.0+exp(-x[3])) );
}

// get neighbor weights (vectorized) for given radius
mat4 mask=mat4(0.0);
mat4 getWeight(in float r, in mat4 relR)
{
    mat4 br =  r/relR  ;


    // b0 exp()  +b1 exp +b2 exp
    mat4 height = mult(b0 , bell(br,rk0,w0))+mult(b1 ,bell(br,rk1,w1))+mult(b2 ,bell(br,rk2,w2));
    mat4 mask=sigmoid(-(br-1.0)*10.0);
    /*
    for(int i=0; i<=4; i++){
        mask[i]= -(sign(br[i]-1.0)-1.0)/2.0;
    }
    */
    return mult(mask,height);
    //return height;
}

// get colors (vectorized) from source channels
vec4 getSrc(in vec3 v, in ivec4 srcv)
{
    return
        v.r * vec4(equal(srcv, iv0)) +
        v.g * vec4(equal(srcv, iv1)) +
        v.b * vec4(equal(srcv, iv2));
}

// get color for destination channel
float getDst(in mat4 m, in ivec4 ch)
{
    return
        dot(m[0], vec4(equal(dst0, ch))) +
        dot(m[1], vec4(equal(dst1, ch))) +
        dot(m[2], vec4(equal(dst2, ch))) +
        dot(m[3], vec4(equal(dst3, ch)));
}

// get values at given position
mat4 getVal(in vec2 xy)
{
    vec2 txy = mod(xy / iResolution.xy, 1.);
    vec3 val = texture(iChannel0, txy).rgb;
    return mat4( getSrc(val, src0), getSrc(val, src1), getSrc(val, src2), getSrc(val, src3) );
}

// draw the shape of kernels
vec3 drawKernel(in vec2 uv)
{
    ivec2 ij = ivec2(uv / 0.25);  // 0..3
    vec2 xy = mod(uv, 0.25) * 8. - 1.;  // -1..1
    if (ij.x > 3) return vec3(0.);
    float r = length(xy);
    vec3 rgb = vec3(getWeight(r, relR)[3-ij.y][ij.x]);
    return rgb/2.;
}

vec3 getInit(in float r, in float x)
{
    if(r>0.2*R/6.) return  vec3(0);
    return vec3(2.0*x+0.5,0,0);
}

vec3 drawInit(in vec2 uv)
{
    ivec2 ij = ivec2(uv / 0.25);  // 0..3
    vec2 xy = mod(uv, 0.25) * 8. - 1.;  // -1..1
    if (ij.x > 4) return vec3(0.);
    float r = length(xy);
    vec3 rgb = vec3(getInit(r,xy.x));
    return rgb;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
		vec3 rgb=vec3(0.);
    fragCoord=fragCoord;
    vec2 uv = (fragCoord) / iResolution.xy;

		if((iMouse.z <= 0. && iFrame !=0) || (color[1]>0.5))
		{
		int intR = int(ceil(R));

    // loop through the neighborhood, optimized: same weights for all quadrants/octants
    // calculate the weighted average of neighborhood from source channel
    mat4 sum = mat4(0.), total = mat4(0.);
    // self
    float r = 0.;
    mat4 weight = getWeight(r, relR);
    mat4 valSrc = getVal(fragCoord + vec2(0, 0)); sum += mult(valSrc, weight); total += weight;
    // orthogonal
    for (int x=1; x<=intR; x++)
    {
        r = float(x) / R;
        weight = getWeight(r, relR);
        valSrc = getVal(fragCoord + vec2(+x, 0)*samplingDist); sum += mult(valSrc, weight); total += weight;
        valSrc = getVal(fragCoord + vec2(-x, 0)*samplingDist); sum += mult(valSrc, weight); total += weight;
        valSrc = getVal(fragCoord + vec2(0, +x)*samplingDist); sum += mult(valSrc, weight); total += weight;
        valSrc = getVal(fragCoord + vec2(0, -x)*samplingDist); sum += mult(valSrc, weight); total += weight;
    }
    // diagonal
    int diagR = int(ceil(float(intR) / sqrt(2.)));
    for (int x=1; x<=diagR; x++)
    {
        r = sqrt(2.) * float(x) / R;
        weight = getWeight(r, relR);
        valSrc = getVal(fragCoord + vec2(+x, +x)*samplingDist); sum += mult(valSrc, weight); total += weight;
        valSrc = getVal(fragCoord + vec2(+x, -x)*samplingDist); sum += mult(valSrc, weight); total += weight;
        valSrc = getVal(fragCoord + vec2(-x, +x)*samplingDist); sum += mult(valSrc, weight); total += weight;
        valSrc = getVal(fragCoord + vec2(-x, -x)*samplingDist); sum += mult(valSrc, weight); total += weight;
    }
    // others
    for (int y=1; y<=intR-1; y++)
    for (int x=y+1; x<=intR; x++)
    {
        r = sqrt(float(x*x + y*y)) / R;
        if (r <= 1.) {
            weight = getWeight(r, relR);
            valSrc = getVal(fragCoord + vec2(+x, +y)*samplingDist); sum += mult(valSrc, weight); total += weight;
            valSrc = getVal(fragCoord + vec2(+x, -y)*samplingDist); sum += mult(valSrc, weight); total += weight;
            valSrc = getVal(fragCoord + vec2(-x, +y)*samplingDist); sum += mult(valSrc, weight); total += weight;
            valSrc = getVal(fragCoord + vec2(-x, -y)*samplingDist); sum += mult(valSrc, weight); total += weight;
            valSrc = getVal(fragCoord + vec2(+y, +x)*samplingDist); sum += mult(valSrc, weight); total += weight;
            valSrc = getVal(fragCoord + vec2(+y, -x)*samplingDist); sum += mult(valSrc, weight); total += weight;
            valSrc = getVal(fragCoord + vec2(-y, +x)*samplingDist); sum += mult(valSrc, weight); total += weight;
            valSrc = getVal(fragCoord + vec2(-y, -x)*samplingDist); sum += mult(valSrc, weight); total += weight;
        }
    }
    mat4 avg = sum / (total + EPSILON);    // avoid divided by zero

    // calculate growth, add a small portion to destination channel
    mat4 growth = mult(eta, bell(avg, mu, sigma) * 2. - 1.);
    vec3 growthDst = vec3( getDst(growth, iv0), getDst(growth, iv1), getDst(growth, iv2) );
    vec3 val = texture(iChannel0, uv).rgb;
    //WALL
		growthDst[0]=growthDst[0]-2.*val[2];
    //lazy trick for attract /non attract mode
    if(color[1]<0.5){
    growthDst[0]=growthDst[0]-growth[3][3]-growth[3][2];
    }
    rgb = clamp(dt * growthDst + val, 0., 1.);
    rgb[1]=0.;
		//rgb[2]=getVal(fragCoord + vec2(+1, 0)*samplingDist)[3][3];

    // debug: uncomment to show list of kernels
    //rgb = drawKernel(fragCoord / iResolution.y);
		}
    // randomize at start, or add patch on mouse click
    if (iFrame == 0 )
    {
        vec3 base = drawInit(fragCoord / iResolution.y);
        vec3 noiseRGB = vec3(
            noise(fragCoord/R/samplingDist + mod(iDate.w,1.)*100.),
            noise(fragCoord/R/samplingDist + sin(iDate.w)*100.),
            noise(fragCoord/R/samplingDist + cos(iDate.w)*100.) );
        //rgb = base+ 0.5*noiseRGB;
				rgb=vec3(0.);
    }
		if(iMouse.z > 0.)
		{
    if(color[1]<0.5){
		rgb = texture(iChannel0, uv).rgb;
    }
		vec2 st = fragCoord.xy/iResolution.xy;
    float m_x = iMouse.x / iResolution.x;
    float m_y = iMouse.y / iResolution.y;
    vec3 m_color = vec3(1.0);
    vec2 dist = vec2(m_x, m_y) - st.xy;
    dist.x *= iResolution.x/iResolution.y;
    float mouse_pct = length(dist);
    if(color[1]>0.5){
     mouse_pct = step(0.4/80., mouse_pct);
    }
    else{
      mouse_pct = step(radius/10., mouse_pct);
    }
		if(color[0]+color[1]+color[2]>0.5)
		{
			m_color = (1.0-mouse_pct)*color;
			rgb = rgb+m_color;
		}else{
			rgb=rgb*mouse_pct;
		}
		}
    fragColor = vec4(rgb, 1.);
}
