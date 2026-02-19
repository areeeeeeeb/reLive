import { IonTabButton } from '@ionic/react'
import { cn } from "@/lib/utils"

interface TabButtonProps {
  tab: string
  href?: string
  disabled?: boolean
  icon: React.ComponentType<any>
  iconId?: string
  isActive?: boolean
  iconClassName?: string
  onClick?: (e: any) => void
  weight?: string
}

export default function TabButton({
  icon: Icon,
  iconId,
  isActive = false,
  iconClassName,
  tab,
  href,
  disabled,
  onClick,
  weight,
}: TabButtonProps) {
  return (
    <IonTabButton tab={tab} href={href} disabled={disabled} onClick={onClick}>
      <Icon
        id={iconId}
        size={24}
        strokeWidth={2}
        weight={weight}
        className={cn(
          isActive ? 'text-white' : 'text-neutral-500',
          iconClassName
        )}
      />
    </IonTabButton>
  )
}

// signal to Ionic that this is a tab bar button component
TabButton.isTabButton = true
