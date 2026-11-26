/**
 * QUOI     — les écrans de l'administration et leurs adresses.
 * POURQUOI — sortis d'App.tsx, qui les place chacun derrière la même garde (AdminRoute).
 */
import type { ReactNode } from 'react'
import { AccountsPage } from '@/features/admin-accounts/AccountsPage'
import { BoardPage } from '@/features/admin-board/BoardPage'
import { HomePage } from '@/features/admin-home/HomePage'
import { ProspectPage } from '@/features/admin-prospects/ProspectPage'
import { ProspectsPage } from '@/features/admin-prospects/ProspectsPage'
import { TemplatesPage } from '@/features/admin-prospects/TemplatesPage'
import { UnclassifiedPage } from '@/features/admin-prospects/UnclassifiedPage'
import { EntityPage } from '@/features/admin-entity/EntityPage'
import { PersonPage } from '@/features/admin-person/PersonPage'
import { ModerationPage } from '@/features/admin-moderation/ModerationPage'
import { AdminEventsPage } from '@/features/admin-events/AdminEventsPage'
import { CategoriesPage } from '@/features/admin-categories/CategoriesPage'
import { TestimonialsPage } from '@/features/admin-testimonials/TestimonialsPage'
import { UpdatesAdminPage } from '@/features/admin-updates/UpdatesAdminPage'
import { FaqAdminPage } from '@/features/admin-faq/FaqAdminPage'

export const ADMIN_ROUTES: [string, ReactNode][] = [
  ['/admin/accueil', <HomePage />],
  ['/admin/taches', <BoardPage />],
  ['/admin/comptes', <AccountsPage />],
  ['/admin/prospects', <ProspectsPage />],
  ['/admin/prospects/modeles', <TemplatesPage />],
  ['/admin/prospects/non-classes', <UnclassifiedPage />],
  ['/admin/prospects/:id', <ProspectPage />],
  ['/admin/signalements', <ModerationPage />],
  ['/admin/evenements', <AdminEventsPage />],
  ['/admin/categories', <CategoriesPage />],
  ['/admin/mises-a-jour', <UpdatesAdminPage />],
  ['/admin/temoignages', <TestimonialsPage />],
  ['/admin/faq', <FaqAdminPage />],
  ['/admin/enseignes/:id', <EntityPage />],
  ['/admin/personnes/:id', <PersonPage />],
]
