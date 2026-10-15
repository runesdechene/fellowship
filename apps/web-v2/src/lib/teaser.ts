/**
 * QUOI     — la ligne de l'aperçu flouté d'une fiche vue sans compte : « 4 avis · 7 questions ».
 * POURQUOI — lot 11b : donner envie de créer un compte avec ce qui existe vraiment ; sans avis
 *            ni question, pas d'aperçu.
 */
export function teaserLine(reviews: number, questions: number): string | null {
  const parts = [
    reviews > 0 ? `${reviews} avis` : null,
    questions > 0 ? `${questions} ${questions > 1 ? 'questions' : 'question'}` : null,
  ].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}
