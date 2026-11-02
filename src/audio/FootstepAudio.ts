import type { HeavyIdentity } from '../config/types';
import type { AudioOutput } from './AudioOutput';
/** Four short cached variants, bounded voices; output cannot enter the microphone graph. */
export class FootstepAudio {
  private buffers?: AudioBuffer[];
  private loading?: Promise<void>;
  private disposed=false;
  private readonly playing=new Map<AudioBufferSourceNode,GainNode>();
  onError: (message:string)=>void=()=>{};
  constructor(private readonly output:AudioOutput,private readonly profile:HeavyIdentity) {}
  prepare(): void {
    if(this.disposed || !this.output.context) return;
    this.loading ??= Promise.all([1,2,3,4].map(index=>this.output.load(this.profile.soundBase+'/'+(this.profile.stepPrefix ?? 'heavy-step')+'-0'+index+'.wav')))
      .then(buffers=>{ if(!this.disposed) this.buffers=buffers; })
      .catch(()=>{this.loading=undefined;this.onError('No se cargaron los pasos. La partida sigue disponible.');});
  }
  play(index:number, strength = 1): void {
    const context=this.output.context, master=this.output.master;
    if(this.disposed || !context || !master || !this.buffers || context.state!=='running' || this.playing.size>=3) return;
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=this.buffers[(index*3)%this.buffers.length];
    source.playbackRate.value=1; // Variations are authored; never move the contact transient in time.
    gain.gain.value=this.profile.footstepGain*strength;
    source.connect(gain);gain.connect(master);this.playing.set(source,gain);
    source.onended=()=>{source.disconnect();gain.disconnect();this.playing.delete(source);};
    source.start();
  }
  silence(): void {
    const context=this.output.context; if(!context)return;
    for(const[source,gain]of this.playing){gain.gain.cancelAndHoldAtTime(context.currentTime);gain.gain.linearRampToValueAtTime(0,context.currentTime+0.05);source.stop(context.currentTime+0.06);}
  }
  dispose():void{this.disposed=true;this.silence();}
}
