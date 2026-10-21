import { describe, expect, it } from 'vitest'
import type { ConversationMember } from '../types/messaging'
import { suggestedMentionsFor } from './suggestedMentions'

const member = (name: string, role: ConversationMember['role'], isProjectCreator = false): ConversationMember => ({
  isProjectCreator,
  name,
  role,
  userId: `id-${name}`,
})

describe('suggestedMentionsFor', () => {
  it('puts the project creator first, then other admins and supervisors, at most three', () => {
    const members = [
      member('Zed Admin', 'organization_admin'),
      member('Amy Supervisor', 'supervisor'),
      member('Cara Creator', 'supervisor', true),
      member('Bo Admin', 'organization_admin'),
      member('Eve Employee', 'employee'),
    ]

    expect(suggestedMentionsFor(members, null).map((person) => person.name)).toEqual([
      'Cara Creator',
      'Amy Supervisor',
      'Bo Admin',
    ])
  })

  it('never suggests employees or the sender, and returns names and ids only', () => {
    const members = [member('Me Supervisor', 'supervisor', true), member('Eve Employee', 'employee')]
    expect(suggestedMentionsFor(members, 'id-Me Supervisor')).toEqual([])
    expect(suggestedMentionsFor([member('Amy', 'supervisor')], null)).toEqual([{ name: 'Amy', userId: 'id-Amy' }])
  })
})
