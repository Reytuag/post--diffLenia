// from https://www.shadertoy.com/view/7lsGDr

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

const ivec4 iv0 = ivec4(0);
const ivec4 iv1 = ivec4(1);
const ivec4 iv2 = ivec4(2);
const ivec4 iv3 = ivec4(3);
const vec4 v0 = vec4(0.);
const vec4 v1 = vec4(1.);
const mat4 m0 = mat4(v0, v0, v0, v0);
const mat4 m1 = mat4(v1, v1, v1, v1);

const float R = 12.;  // space resolution = kernel radius
uniform float T;  // time resolution = number of divisions per unit time
uniform float baseNoise;
uniform mat4 betaLen;  // kernel ring number
uniform mat4 beta0;  // kernel ring heights
uniform mat4 beta1;
uniform mat4 beta2;
uniform mat4 mu;  // growth center
uniform mat4 sigma;  // growth width
uniform mat4 eta;  // growth strength
uniform mat4 relR;  // relative kernel radius

const mat4 src = mat4( 0., 0., 0., 1., 1., 1., 2., 2., 2., 0., 0., 1., 1., 2., 2., v0 );  // source channels
const mat4 dst = mat4( 0., 0., 0., 1., 1., 1., 2., 2., 2., 1., 2., 0., 2., 0., 1., v0 );  // destination channels
//const mat4 src = mat4( 0., 0., 0., 1., 1., 1., 2., 2., 2., v0, v0 );  // source channels
//const mat4 dst = mat4( 0., 0., 0., 1., 1., 1., 2., 2., 2., v0, v0 );  // destination channels

// precalculate
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


// modified from SmoothLife by davidar - https://www.shadertoy.com/view/Msy3RD

// bell-shaped curve (Gaussian bump)
mat4 bell(in mat4 x, in mat4 m, in mat4 s)
{
    mat4 v = -mult(x-m, x-m) / s / s / 2.;
    return mat4( exp(v[0]), exp(v[1]), exp(v[2]), exp(v[3]) );
}

mat4 intEqual4(in mat4 m, in ivec4 v) {
    return mat4( equal(ivec4(m[0]), v), equal(ivec4(m[1]), v), equal(ivec4(m[2]), v), equal(ivec4(m[3]), v) );
}
// get neighbor weights for given radius
mat4 getWeight(in float r, in mat4 relR) {
    if (r > 1.) return m0;
    mat4 Br = betaLen / relR * r;  // scale radius by number of rings and relative radius
    //mat4 height = mult(beta0, intEqual4(Br, iv0)) + mult(beta1, intEqual4(Br, iv1));  // + mult(beta2, floorEqual(Br, iv2))
    ivec4 Br0 = ivec4(Br[0]), Br1 = ivec4(Br[1]), Br2 = ivec4(Br[2]), Br3 = ivec4(Br[3]);

    // (Br==0 ? beta0 : 0) + (Br==1 ? beta1 : 0) + (Br==2 ? beta2 : 0)
    mat4 height = mat4(
        beta0[0] * vec4(equal(Br0, iv0)) + beta1[0] * vec4(equal(Br0, iv1)) + beta2[0] * vec4(equal(Br0, iv2)),
        beta0[1] * vec4(equal(Br1, iv0)) + beta1[1] * vec4(equal(Br1, iv1)) + beta2[1] * vec4(equal(Br1, iv2)),
        beta0[2] * vec4(equal(Br2, iv0)) + beta1[2] * vec4(equal(Br2, iv1)) + beta2[2] * vec4(equal(Br2, iv2)),
        beta0[3] * vec4(equal(Br3, iv0)) + beta1[3] * vec4(equal(Br3, iv1)) + beta2[3] * vec4(equal(Br3, iv2)) );
    mat4 mod1 = mat4( fract(Br[0]), fract(Br[1]), fract(Br[2]), fract(Br[3]) );
    return mult(height, bell(mod1, kmu, ksigma));
}
// get neighbor weights (vectorized) for given radius
mat4 _getWeight(in float r, in mat4 relR)
{
    mat4 Br = betaLen / relR * r;
    ivec4 Br0 = ivec4(Br[0]), Br1 = ivec4(Br[1]), Br2 = ivec4(Br[2]), Br3 = ivec4(Br[3]);

    // (Br==0 ? beta0 : 0) + (Br==1 ? beta1 : 0) + (Br==2 ? beta2 : 0)
    mat4 height = mat4(
        beta0[0] * vec4(equal(Br0, iv0)) + beta1[0] * vec4(equal(Br0, iv1)) + beta2[0] * vec4(equal(Br0, iv2)),
        beta0[1] * vec4(equal(Br1, iv0)) + beta1[1] * vec4(equal(Br1, iv1)) + beta2[1] * vec4(equal(Br1, iv2)),
        beta0[2] * vec4(equal(Br2, iv0)) + beta1[2] * vec4(equal(Br2, iv1)) + beta2[2] * vec4(equal(Br2, iv2)),
        beta0[3] * vec4(equal(Br3, iv0)) + beta1[3] * vec4(equal(Br3, iv1)) + beta2[3] * vec4(equal(Br3, iv2)) );
    mat4 mod1 = mat4( mod(Br[0], 1.), mod(Br[1], 1.), mod(Br[2], 1.), mod(Br[3], 1.) );
    return mult(height, bell(mod1, kmu, ksigma));
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
    return rgb;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord / iResolution.xy;

    // loop through the neighborhood, optimized: same weights for all quadrants/octants
    // calculate the weighted average of neighborhood from source channel
    mat4 sum = mat4(0.), total = mat4(0.);
    // self
    float r = 0.;
    mat4 weight = getWeight(r, relR);
    mat4 valSrc = getVal(fragCoord + vec2(0, 0)); sum += mult(valSrc, weight); total += weight;
    // orthogonal
    const int intR = int(ceil(R));
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
    const int diagR = int(ceil(float(intR) / sqrt(2.)));
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
    vec3 rgb = clamp(growthDst / T + val, 0., 1.);

    // debug: uncomment to show list of kernels
    //rgb = drawKernel(fragCoord / iResolution.y);

    // randomize at start, or add patch on mouse click
    if (iFrame == 0 || iMouse.z > 0.)
    {
        vec3 noiseRGB = vec3(
            noise(fragCoord/R/2./samplingDist + mod(iDate.w,1.)*100.),
            noise(fragCoord/R/2./samplingDist + sin(iDate.w)*100.),
            noise(fragCoord/R/2./samplingDist + cos(iDate.w)*100.) );
        rgb = baseNoise + noiseRGB;
    }

    fragColor = vec4(rgb, 1.);
}
