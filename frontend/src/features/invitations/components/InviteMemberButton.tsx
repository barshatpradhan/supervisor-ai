import { Button } from '../../../components/ui/Button'

interface InviteMemberButtonProps {
  onClick: () => void
}

export function InviteMemberButton({ onClick }: InviteMemberButtonProps) {
  return (
    <Button onClick={onClick} type="button">
      Invite member
    </Button>
  )
}
