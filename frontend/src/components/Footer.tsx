import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <span className="text-2xl font-bold text-white">ProWider</span>
            <p className="mt-3 text-sm leading-relaxed max-w-md">
              Find trusted local professionals for any job. Book services with confidence through our simple marketplace.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/service/1" className="hover:text-white transition-colors">Plumbing</Link></li>
              <li><Link href="/service/2" className="hover:text-white transition-colors">Electrical</Link></li>
              <li><Link href="/service/3" className="hover:text-white transition-colors">Cleaning</Link></li>
              <li><Link href="/#services" className="hover:text-white transition-colors">All Services</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/#testimonials" className="hover:text-white transition-colors">Reviews</Link></li>
              <li><Link href="/provider/login" className="hover:text-white transition-colors">Provider Login</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Admin Login</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 text-sm text-center">
          © {new Date().getFullYear()} ProWider. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
