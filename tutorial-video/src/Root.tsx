import { Composition } from 'remotion'
import { Tutorial } from './Tutorial'
import { totalFrames } from './data'
export const RemotionRoot = () => <Composition id="Tutorial" component={Tutorial} durationInFrames={totalFrames} fps={30} width={1920} height={1080} />
