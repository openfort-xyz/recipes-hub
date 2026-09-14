interface FooterProps {
  bottomLinks?: {
    text: string
    url: string
  }[]
}

export default function Footer({
  bottomLinks = [
    {
      text: 'GitHub',
      url: 'https://github.com/openfort-xyz',
    },
    { text: 'Docs', url: 'https://www.openfort.io/docs' },
    { text: 'Dashboard', url: 'https://dashboard.openfort.io' },
    { text: 'Bridge Docs', url: 'https://apidocs.bridge.xyz' },
    { text: 'Support', url: 'https://www.openfort.io/company/contact' },
  ],
}: FooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-t border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">Openfort × Bridge</span>
          <ul className="flex gap-4">
            {bottomLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  className="hover:text-foreground transition-colors duration-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
