// One small, decorative surface shared by the tool hub and display.
const shader = `
@vertex fn vertex(@builtin(vertex_index) i:u32) -> @builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
 return vec4f(p[i],0,1);
}
@group(0) @binding(0) var<uniform> phase:f32;
@fragment fn fragment(@builtin(position) p:vec4f) -> @location(0) vec4f {
 let uv=p.xy/vec2f(320,96);
 let curve=.26+.14*sin(uv.x*5.+phase);
 let light=exp(-7.*abs(uv.y-curve))*smoothstep(.0,.75,uv.x)*(1.-uv.y);
 let hue=mix(vec3f(.38,.58,.61),vec3f(.88,.64,.43),uv.x);
 return vec4f(hue*light,light);
}`;
export async function mountAmbient(host,signal,slow){
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
 if(!adapter||signal.aborted)return false;
 const device=await adapter.requestDevice();
 if(signal.aborted){device.destroy();return false;}
 const canvas=document.createElement('canvas');
 canvas.width=320;canvas.height=96;
 let frame=0,tick;
 const cleanup=()=>{
  cancelAnimationFrame(frame);
  if(tick)window.removeEventListener('pointerdown',tick);
  canvas.remove();device.destroy();
 };
 signal.addEventListener('abort',cleanup,{once:true});
 try{
  const context=canvas.getContext('webgpu');
  const format=navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode:'premultiplied'});
  const module=device.createShaderModule({code:shader});
  const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format}]}});
  if(signal.aborted)return false;
  const buffer=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
  let start=0,last=0,late=0;
  const draw=time=>{
   if(signal.aborted)return;
   if(last&&time-last>45&&++late>=4){slow();return;}
   last=time;
   device.queue.writeBuffer(buffer,0,new Float32Array([Math.min(time-start,650)/700]));
   const encoder=device.createCommandEncoder();
   const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:[0,0,0,0],loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);
   if(time-start<650)frame=requestAnimationFrame(draw);
  };
  tick=()=>{cancelAnimationFrame(frame);start=performance.now();last=0;late=0;frame=requestAnimationFrame(draw);};
  device.lost.then(()=>{if(!signal.aborted)slow();});
  device.addEventListener('uncapturederror',()=>{if(!signal.aborted)slow();});
  host.append(canvas);window.addEventListener('pointerdown',tick,{passive:true});tick();return true;
 }catch(error){if(!signal.aborted)cleanup();throw error;}
}
