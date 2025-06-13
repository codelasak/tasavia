'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plane, 
  Settings, 
  Shield, 
  Users, 
  MapPin, 
  Mail, 
  Phone,
  ChevronRight,
  Award,
  Wrench,
  Package,
  Building,
  ArrowRight,
  Menu,
  X
} from 'lucide-react'

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMenuOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="TASAVIA"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <button
                  onClick={() => scrollToSection('home')}
                  className="text-slate-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection('about')}
                  className="text-slate-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  About Us
                </button>
                <button
                  onClick={() => scrollToSection('services')}
                  className="text-slate-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Services
                </button>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="text-slate-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Contact
                </button>
                <Link href="/portal">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Portal Login
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-700 hover:text-blue-600 p-2"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                onClick={() => scrollToSection('home')}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-blue-600 w-full text-left"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-blue-600 w-full text-left"
              >
                About Us
              </button>
              <button
                onClick={() => scrollToSection('services')}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-blue-600 w-full text-left"
              >
                Services
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-blue-600 w-full text-left"
              >
                Contact
              </button>
              <Link href="/portal" className="block px-3 py-2">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  Portal Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.pexels.com/photos/358319/pexels-photo-358319.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')`
          }}
        />
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            YOUR PARTNER TO KEEP
            <span className="block text-blue-400">AIRCRAFTS FLYING</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-slate-200">
            TASAVIA is an ISO9001 certified aviation technical and commercial services provider.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              onClick={() => scrollToSection('services')}
            >
              Our Services
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-slate-900 px-8 py-4 text-lg"
              onClick={() => scrollToSection('contact')}
            >
              Get In Touch
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronRight className="h-6 w-6 text-white rotate-90" />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">About TASAVIA</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              With a highly experienced team, we support our customers on the following subjects in the aviation industry
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Plane className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Aircraft Teardown</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Professional aircraft dismantling and component recovery services
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">Component Sale/Exchange</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Comprehensive parts trading and exchange solutions
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Wrench className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Repair Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Expert repair coordination and quality management
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Technical Consultancy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Professional aviation technical consulting services
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Certification Badge */}
          <div className="text-center mt-16">
            <Badge className="bg-blue-600 text-white px-6 py-2 text-lg">
              <Award className="h-5 w-5 mr-2" />
              ISO9001 Certified
            </Badge>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Our Top Services</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We provide a wide range of technical and commercial solutions to meet all your aviation needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Aircraft Teardown Management",
                description: "Complete aircraft dismantling services with component recovery and documentation",
                icon: Plane,
                color: "blue"
              },
              {
                title: "Aircraft Base Maintenance Management",
                description: "Comprehensive maintenance planning and execution oversight",
                icon: Settings,
                color: "green"
              },
              {
                title: "Repair Management",
                description: "End-to-end repair coordination and quality assurance",
                icon: Wrench,
                color: "purple"
              },
              {
                title: "Component Sales & Exchange",
                description: "Global parts trading and exchange network",
                icon: Package,
                color: "orange"
              },
              {
                title: "Aircraft Sales & Procurement Management",
                description: "Aircraft acquisition and disposal services",
                icon: Building,
                color: "red"
              },
              {
                title: "On-site Technical Support",
                description: "Expert technical assistance at your location",
                icon: Shield,
                color: "indigo"
              }
            ].map((service, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 group">
                <CardHeader>
                  <div className={`w-12 h-12 bg-${service.color}-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <service.icon className={`h-6 w-6 text-${service.color}-600`} />
                  </div>
                  <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                    {service.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">{service.description}</p>
                  <div className="flex items-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Contact Us</h2>
            <p className="text-xl text-slate-300">
              Get in touch with our team for all your aviation needs
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Turkey Office */}
            <Card className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center">
                  <MapPin className="h-6 w-6 mr-3 text-blue-400" />
                  Turkey Office
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Building className="h-5 w-5 text-slate-400 mt-1" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-slate-300">
                      EMNİYETTEPE MAH. SADABAT SK.<br />
                      NO: 11/1 EYÜPSULTAN / ISTANBUL / TURKEY
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a href="mailto:rfq@tasavia.com" className="text-blue-400 hover:text-blue-300">
                      rfq@tasavia.com
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* USA Office */}
            <Card className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center">
                  <MapPin className="h-6 w-6 mr-3 text-blue-400" />
                  USA Office
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Building className="h-5 w-5 text-slate-400 mt-1" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-slate-300">
                      18815 LANTERN COVE LN<br />
                      TOMBALL TX 77375 USA
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a href="mailto:sales@tasavia.com" className="text-blue-400 hover:text-blue-300">
                      sales@tasavia.com
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <h3 className="text-2xl font-bold mb-4">Ready to Work With Us?</h3>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
              Contact our team today to discuss your aviation needs and discover how TASAVIA can help keep your aircraft flying.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Mail className="mr-2 h-5 w-5" />
                Send RFQ
              </Button>
              <Link href="/portal">
                <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                  Access Portal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <Image
                src="/logo.png"
                alt="TASAVIA"
                width={100}
                height={33}
                className="h-8 w-auto mr-4"
              />
              <p>&copy; 2025 TASAVIA. All Rights Reserved.</p>
            </div>
            <div className="flex items-center space-x-6">
              <Badge className="bg-blue-600 text-white">
                <Award className="h-4 w-4 mr-1" />
                ISO9001 Certified
              </Badge>
              <Link href="/portal" className="hover:text-white transition-colors">
                Portal Access
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}