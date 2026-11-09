import React from 'react'
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate } from 'remotion'
import { chapters } from './data'

type Chapter = { id: string; title: string; assets?: { path: string }[]; audio?: string; duration?: number; narration?: string }
const colors = { navy: '#102a56', teal: '#0d9c9c', ink: '#24334d', muted: '#63728a', line: '#dce4ed', pale: '#f5f8fb' }
export const Tutorial = () => <AbsoluteFill style={{ background: 'white', fontFamily: 'Arial, sans-serif', color: colors.ink }}>{chapters.length ? chapters.map((chapter, index) => <Sequence key={chapter.id} from={chapters.slice(0, index).reduce((sum, item) => sum + Math.ceil((item.duration || 4) * 30), 0)} durationInFrames={Math.ceil((chapter.duration || 4) * 30)}><Scene chapter={chapter} /></Sequence>) : <div style={{ padding: 80, color: colors.navy, fontSize: 54 }}>Jalankan capture, narration, lalu render.</div>}</AbsoluteFill>
function Scene({ chapter }: { chapter: Chapter }) {
  const frame = useCurrentFrame()
  const duration = Math.ceil((chapter.duration || 4) * 30)
  const opacity = interpolate(frame, [0, 12, duration - 18, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const image = chapter.assets?.[0]?.path
  return <AbsoluteFill style={{ opacity, padding: 64 }}><div style={{ fontSize: 22, color: colors.teal, letterSpacing: 3, textTransform: 'uppercase' }}>BMC Online</div><h1 style={{ color: colors.navy, fontSize: 60, margin: '18px 0' }}>{chapter.title}</h1><div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>{image && <Img src={staticFile(image)} style={{ width: 1240, height: 760, objectFit: 'contain', border: `1px solid ${colors.line}`, background: colors.pale }} />}<p style={{ width: 400, fontSize: 28, lineHeight: 1.45, color: colors.muted }}>{chapter.narration || ''}</p></div><div style={{ position: 'absolute', left: 64, right: 64, bottom: 36, padding: '12px 20px', background: 'rgba(16,42,86,.94)', color: 'white', fontSize: 24, textAlign: 'center' }}>{chapter.narration || ''}</div>{chapter.audio && <Audio src={staticFile(chapter.audio)} volume={0.95} />}</AbsoluteFill>
}
