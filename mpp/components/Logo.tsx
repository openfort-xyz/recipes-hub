'use client'

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

/**
 * Openfort wordmark: the stepped "O" brand mark followed by the Openfort name.
 *
 * @param className - Applied to the wrapping element (controls the text color).
 * @param width - Width of the brand mark in pixels (the text scales with it).
 * @param height - Height of the brand mark in pixels.
 */
export function Logo({ className = '', width = 36, height = 22 }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 18 11"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M9.9528 7.63477H8.04474V11H9.9528V7.63477Z" fill="#FC3627" />
        <path d="M16.0795 11H18V0.00195312L0.00466919 0V11H1.91535V1.90479H16.0795V11Z" fill="#FC3627" />
        <path d="M14.1479 11L14.1583 3.81055H3.83386V11H5.74454V5.71338H12.2398V11H14.1479Z" fill="#FC3627" />
      </svg>
      <span className="text-lg font-semibold tracking-tight">Openfort</span>
    </span>
  )
}
