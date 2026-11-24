import { StarRating, SurfaceCard } from '../../components'
import { Resource, useResource } from '../../components/client-shared'
import { clientFeedback } from '../../lib/client-feedback'
import { demoMode } from '../../lib/api'

function reviewDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PublicFeedback({ companyId }: { companyId: string }) {
  const resource = useResource(() => clientFeedback.publicReviews(companyId), [companyId])
  const reviews = resource.data || []
  const rating = reviews.length ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1) : null
  return <SurfaceCard className="space-y-4 p-6">
    <h2 className="sf-display text-xl font-semibold">Client reviews</h2>
    <Resource {...resource} retry={resource.reload}>
      {reviews.length ? <>
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <StarRating rating={Number(rating)} />
          <span className="sf-tabular">{rating} / 5 from {reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
          {demoMode && <span>· Sample reviews</span>}
        </p>
        {reviews.map(review => <article key={review.id} className="space-y-2 border-t border-line pt-4">
          <p className="flex flex-wrap items-center gap-2 font-semibold">{review.author} <StarRating rating={review.rating} /></p>
          {review.comment && <p className="whitespace-pre-wrap">{review.comment}</p>}
          <p className="sf-mono text-xs text-text-secondary">{[review.service_name, reviewDate(review.reviewed_at)].filter(Boolean).join(' · ') || 'Completed job'}</p>
        </article>)}
      </> : <p className="text-sm text-text-secondary">No reviews yet. When a client rates a completed job, their review will appear here.</p>}
    </Resource>
  </SurfaceCard>
}
