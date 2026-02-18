import { useEffect, useRef, useState } from "react";

const vertexShader = `
@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(3.0, 1.0)
  );
  let xy = positions[vertexIndex];
  return vec4<f32>(xy, 0.0, 1.0);
}
`;

const fragmentShader = `
struct Uniforms {
  time: f32,
  aspect: f32,
  mouseX: f32,
  mouseY: f32,
  width: f32,
  height: f32,
  pad0: f32,
  pad1: f32
}

@group(0) @binding(0) var<uniform> u: Uniforms;

fn trail(uv: vec2<f32>, offset: f32, depth: f32) -> f32 {
  let t = u.time * 0.3 + offset;
  let mouse = vec2<f32>((u.mouseX * 2.0) - 1.0, ((1.0 - u.mouseY) * 2.0) - 1.0);
  var p = uv;
  p.x = p.x * u.aspect;
  p = p + mouse * depth * 0.22;
  let y = sin((p.x + t) * 5.0 + depth * 9.0) * (0.14 + depth * 0.08);
  let d = abs(p.y - y);
  let glow = exp(-d * (30.0 + depth * 30.0));
  return glow * (0.45 + depth);
}

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let resolution = vec2<f32>(u.width, u.height);
  var uv = (fragCoord.xy / resolution) * 2.0 - vec2<f32>(1.0, 1.0);
  uv.y = -uv.y;

  var glow: f32 = 0.0;
  for (var i: i32 = 0; i < 24; i = i + 1) {
    let fi = f32(i);
    let depth = fi / 24.0;
    glow = glow + trail(uv, fi * 0.27, depth);
  }

  let base = vec3<f32>(0.02, 0.04, 0.09);
  let saffron = vec3<f32>(1.0, 0.60, 0.20);
  let ice = vec3<f32>(0.35, 0.9, 1.0);

  let boosted = pow(glow * 0.11, 1.2);
  var color = base + saffron * boosted + ice * boosted * 0.28;

  let vignette = smoothstep(1.6, 0.2, length(uv));
  color = color * vignette;

  return vec4<f32>(color, 0.95);
}
`;

export default function WebGPUHero() {
  const canvasRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    let animationFrame;
    let destroy = () => {};

    const initialize = async () => {
      const canvas = canvasRef.current;
      if (!canvas || !navigator.gpu) {
        setIsSupported(false);
        return;
      }

      const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) {
        setIsSupported(false);
        return;
      }

      const device = await adapter.requestDevice();
      const context = canvas.getContext("webgpu");
      const format = navigator.gpu.getPreferredCanvasFormat();

      const uniforms = new Float32Array(8);
      const uniformBuffer = device.createBuffer({
        size: uniforms.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: device.createShaderModule({ code: vertexShader }),
          entryPoint: "main"
        },
        fragment: {
          module: device.createShaderModule({ code: fragmentShader }),
          entryPoint: "main",
          targets: [{ format }]
        },
        primitive: {
          topology: "triangle-list"
        }
      });

      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
      });

      const mouse = { x: 0.5, y: 0.5 };
      const onMouseMove = (event) => {
        mouse.x = event.clientX / Math.max(window.innerWidth, 1);
        mouse.y = event.clientY / Math.max(window.innerHeight, 1);
      };
      window.addEventListener("pointermove", onMouseMove);

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        canvas.width = width;
        canvas.height = height;
        context.configure({
          device,
          format,
          alphaMode: "premultiplied"
        });
      };

      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);

      const start = performance.now();
      const render = (now) => {
        const elapsed = (now - start) * 0.001;

        uniforms[0] = elapsed;
        uniforms[1] = canvas.width / Math.max(canvas.height, 1);
        uniforms[2] = mouse.x;
        uniforms[3] = mouse.y;
        uniforms[4] = canvas.width;
        uniforms[5] = canvas.height;
        uniforms[6] = 0;
        uniforms[7] = 0;

        device.queue.writeBuffer(uniformBuffer, 0, uniforms.buffer);

        const encoder = device.createCommandEncoder();
        const view = context.getCurrentTexture().createView();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view,
              clearValue: { r: 0.015, g: 0.02, b: 0.06, a: 1 },
              loadOp: "clear",
              storeOp: "store"
            }
          ]
        });

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3, 1, 0, 0);
        pass.end();

        device.queue.submit([encoder.finish()]);
        animationFrame = requestAnimationFrame(render);
      };

      animationFrame = requestAnimationFrame(render);

      destroy = () => {
        cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        window.removeEventListener("pointermove", onMouseMove);
      };
    };

    initialize().catch(() => {
      setIsSupported(false);
    });

    return () => destroy();
  }, []);

  return (
    <div className="webgpu-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="webgpu-canvas" />
      {!isSupported && (
        <div className="webgpu-fallback">WebGPU is not available. Showing static gradient.</div>
      )}
    </div>
  );
}

