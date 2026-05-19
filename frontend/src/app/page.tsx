"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HeroSearch from "@/components/HeroSearch";
import { SERVICE_CATALOG, TESTIMONIALS } from "@/lib/services";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Find the Right Professional for Any Job
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Browse trusted local experts. Book plumbing, electrical, cleaning, and more in minutes.
          </p>
          <HeroSearch />
        </div>
      </section>

      <section id="services" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Popular Services</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Choose from our most requested categories and book a verified professional today.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICE_CATALOG.map((service) => (
              <Link
                key={service.id}
                href={`/service/${service.backendServiceId}?category=${encodeURIComponent(service.name)}`}
                className="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all"
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {service.name}
                </h3>
                <p className="text-sm text-blue-600 font-medium mt-1">{service.category}</p>
                <p className="text-gray-600 text-sm mt-3 leading-relaxed">{service.description}</p>
                <span className="inline-block mt-4 text-sm font-semibold text-blue-600 group-hover:underline">
                  Book now →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How ProWider Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Browse & Choose", desc: "Search our catalog and pick the service you need." },
              { step: "2", title: "Book Online", desc: "Fill in your details and preferred date — we handle the rest." },
              { step: "3", title: "Get Matched", desc: "Your request is routed to trusted local providers instantly." },
            ].map((item) => (
              <div key={item.step} className="text-center p-6">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-gray-600 italic leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-4 border-t border-gray-100 pt-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.service}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
