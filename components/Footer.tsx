"use client";

export default function Footer() {

  return (
    <>
      <footer className="p-6">
        <div className="flex justify-center mb-4">
          <div className="flex space-x-4">
            <span className="flex items-center space-x-1 text-dark-dim font-mono">
              <kbd>tab</kbd>
              <span>+</span>
              <kbd>enter</kbd>
              <span>or</span>
              <kbd>esc</kbd>
              <span>- restart game</span>
            </span>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              href="https://discord.gg/etherlink"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors font-mono"
            >
              <i className="fa-brands fa-discord h-4 w-4" />
              <span>discord</span>
            </a>
            <a
              href="https://twitter.com/etherlink"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors font-mono"
            >
              <i className="fa-brands fa-twitter h-4 w-4" />
              <span>twitter</span>
            </a>
            <a href="https://tezos.com/privacy-notice/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-dark-dim hover:text-dark-highlight transition-colors font-mono">
              <i className="fa-solid fa-lock h-4 w-4" />
              <span>privacy</span>
            </a>
          </div>
          <div className="flex space-x-2 text-dark-dim font-mono">
            <span>etherlink</span>
            <a href="https://medium.com/@etherlink/announcing-ebisu-a-5th-upgrade-proposal-for-etherlink-mainnet-4dfdd1c8819e" target="_blank" rel="noopener noreferrer" className="hover:text-dark-highlight transition-colors">
              <span>v:5.0.0 ebisu</span>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

