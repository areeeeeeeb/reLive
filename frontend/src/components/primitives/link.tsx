import * as React from "react"
import { useIonRouter } from "@ionic/react"
import { cn } from "@/lib/utils"

export interface LinkProps extends React.ComponentPropsWithoutRef<"a"> {
  to: string
  replace?: boolean
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, replace = false, children, onClick, className, ...props }, ref) => {
    const router = useIonRouter()

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)

      if (!e.defaultPrevented) {
        e.preventDefault()
        if (replace) {
          router.push(to, 'none', 'replace')
        } else {
          router.push(to, 'forward')
        }
      }
    }

    return (
      <a ref={ref} href={to} onClick={handleClick} className={cn("underline-offset-4  hover:underline", className)} {...props}>
        {children}
      </a>
    )
  }
)
Link.displayName = "Link"

export { Link }
