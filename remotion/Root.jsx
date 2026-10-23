import { Composition } from 'remotion'
import { BmcTutorial, TUTORIAL_DURATION } from './BmcTutorial'

export const RemotionRoot = () => <Composition id="BmcTutorial" component={BmcTutorial} durationInFrames={TUTORIAL_DURATION} fps={30} width={1080} height={1920} />
