export default function PortalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome to TASAVIA Portal</h1>
        {/* Remove or minimize subtitle for mobile */}
        <p className="text-base text-slate-500 md:text-lg hidden md:block">This is now a public page. No login required.</p>
      </div>
    </div>
  );
}