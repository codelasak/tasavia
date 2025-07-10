'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion'
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
  X,
  Rocket,
  Globe,
  BarChart2,
  CheckCircle,
  ArrowUpRight,
  MoveRight,
  Sparkles,
  Send,
  Linkedin,
  Phone as PhoneIcon
} from 'lucide-react'

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Animated Counter Component
interface AnimatedCounterProps {
  value: number;
  suffix?: string;
}

const AnimatedCounter = ({ value, suffix = '' }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      controls.start({
        opacity: 1,
        scale: [1, 1.1, 1],
        transition: { duration: 0.5 }
      });
      
      let start = 0;
      const end = value; // No need to parse since value is already a number
      const duration = 2000;
      const incrementTime = duration / end;
      
      const timer = setInterval(() => {
        start += 1;
        setCount(start);
        if (start >= end) clearInterval(timer);
      }, incrementTime);
      
      return () => clearInterval(timer);
    }
  }, [isInView, value, controls]);

  return (
    <motion.span 
      ref={ref}
      animate={controls}
      initial={{ opacity: 0 }}
      className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent"
    >
      {count}+{suffix}
    </motion.span>
  );
};

// Feature Card Component
interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay: delay * 0.1 }}
    className="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100 dark:border-slate-800"
  >
    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
    <p className="text-slate-600 dark:text-slate-400">{description}</p>
    <div className="absolute -z-10 inset-0 rounded-2xl bg-gradient-to-br from-blue-50 to-white dark:from-slate-800/50 dark:to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity" />
  </motion.div>
);

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
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50 to-white dark:from-slate-900 dark:to-slate-950"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src="/logo.png"
                alt="TASAVIA"
                width={110}
                height={36}
                className="h-12 w-36"
                priority
              />
            </motion.div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-6">
                <motion.button
                  onClick={() => scrollToSection('home')}
                  whileHover={{ y: -2 }}
                  className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Home
                </motion.button>
                <motion.button
                  onClick={() => scrollToSection('about')}
                  whileHover={{ y: -2 }}
                  className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  About Us
                </motion.button>
                <motion.button
                  onClick={() => scrollToSection('services')}
                  whileHover={{ y: -2 }}
                  className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Services
                </motion.button>
                <motion.button
                  onClick={() => scrollToSection('contact')}
                  whileHover={{ y: -2 }}
                  className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Contact
                </motion.button>
              </div>
            </div>

            {/* Mobile menu button */}
            <motion.div 
              className="md:hidden"
              whileTap={{ scale: 0.9 }}
            >
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </motion.div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
            >
              <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
                <motion.button
                  onClick={() => scrollToSection('home')}
                  whileHover={{ x: 5 }}
                  className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Home
                </motion.button>
                <motion.button
                  onClick={() => scrollToSection('about')}
                  whileHover={{ x: 5 }}
                  className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  About Us
                </motion.button>
                <motion.button
                  onClick={() => scrollToSection('services')}
                  whileHover={{ x: 5 }}
                  className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Services
                </motion.button>
                <motion.button
                  onClick={() => scrollToSection('contact')}
                  whileHover={{ x: 5 }}
                  className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Contact
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* Animated background elements */}
        <motion.div 
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute -bottom-20 left-0 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mb-6"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span>Innovating Aviation Solutions</span>
            </motion.div>
            
            <motion.h1 
              className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span className="block">YOUR PARTNER TO</span>
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              KEEP AIRCRAFTS FLYING
              </span>
            </motion.h1>
            
            <motion.p 
              className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Your trusted partner for comprehensive aviation solutions. We deliver excellence in every flight with cutting-edge technology and unparalleled service.
            </motion.p>
            
            <motion.div 
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Link href="#services" className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  Our Services
                </Button>
              </Link>
            </motion.div>
          </div>
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
      <section id="services" className="relative py-24 bg-white dark:bg-slate-950 overflow-hidden">
        {/* Background elements */}
        <div className="absolute -z-10 top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -right-40 -top-40 w-96 h-96 bg-blue-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-cyan-500/5 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mb-4">
              <Rocket className="w-4 h-4 mr-2" />
              <span>Our Services</span>
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl">
              Comprehensive <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Aviation Solutions</span>
            </h2>
            <p className="mt-4 text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Delivering excellence in aviation services with cutting-edge technology and unparalleled expertise.
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              {
                title: "Aircraft Teardown Management",
                description: "Complete aircraft dismantling services with component recovery and documentation, ensuring maximum value extraction and regulatory compliance.",
                icon: Plane,
                color: "blue"
              },
              {
                title: "Maintenance Management",
                description: "End-to-end maintenance planning and execution oversight to ensure aircraft airworthiness and operational efficiency.",
                icon: Settings,
                color: "green"
              },
              {
                title: "Repair & Overhaul",
                description: "Comprehensive repair management with quality assurance and quick turnaround times for minimal downtime.",
                icon: Wrench,
                color: "purple"
              },
              {
                title: "Component Solutions",
                description: "Global network for aircraft parts trading, exchange, and logistics with certified quality standards.",
                icon: Package,
                color: "indigo"
              },
              {
                title: "Aircraft Transactions",
                description: "Expert guidance in aircraft acquisition, leasing, and disposal with comprehensive asset management.",
                icon: Building,
                color: "red"
              },
              {
                title: "Technical Support",
                description: "24/7 on-site and remote technical assistance with certified engineers and rapid response teams.",
                icon: Shield,
                color: "amber"
              }
            ].map((service, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="group"
              >
                <Card className="h-full bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-300 overflow-hidden group-hover:shadow-xl group-hover:-translate-y-1">
                  <CardHeader className="relative">
                    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-${service.color}-100/30 dark:bg-${service.color}-900/20 group-hover:scale-110 transition-transform`}></div>
                    <div className={`w-12 h-12 rounded-xl bg-${service.color}-100 dark:bg-${service.color}-900/30 flex items-center justify-center mb-6 group-hover:bg-${service.color}-200 dark:group-hover:bg-${service.color}-900/50 transition-colors`}>
                      <service.icon className={`w-6 h-6 text-${service.color}-600 dark:text-${service.color}-400`} />
                    </div>
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">{service.description}</p>
                    <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                      <span className="mr-2">Learn more</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          
          <motion.div 
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link href="/contact">
              <Button 
                variant="outline" 
                size="lg" 
                className="group border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                Explore All Services
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative py-24 bg-slate-900 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,transparent)]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 mb-4">
              <Mail className="w-4 h-4 mr-2" />
              <span>Get in Touch</span>
            </div>
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
              Ready to <span className="text-blue-400">Elevate</span> Your Aviation Experience?
            </h2>
            <p className="mt-4 text-xl text-slate-400 max-w-3xl mx-auto">
              Our team is ready to assist you with any inquiries. Reach out to us and we&apos;ll respond as soon as possible.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/30 transition-colors duration-300 h-full">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">Send us a Message</CardTitle>
                  <CardDescription className="text-slate-400">
                    Fill out the form and our team will get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label 
                          htmlFor="name" 
                          className="block text-sm font-medium text-slate-300"
                        >
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <label 
                          htmlFor="email" 
                          className="block text-sm font-medium text-slate-300"
                        >
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label 
                        htmlFor="subject" 
                        className="block text-sm font-medium text-slate-300"
                      >
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="How can we help you?"
                      />
                    </div>
                    <div className="space-y-2">
                      <label 
                        htmlFor="message" 
                        className="block text-sm font-medium text-slate-300"
                      >
                        Message *
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        required
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        placeholder="Tell us more about your needs..."
                      ></textarea>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="privacy"
                          required
                          className="h-4 w-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                        />
                        <label 
                          htmlFor="privacy" 
                          className="ml-2 block text-sm text-slate-400"
                        >
                          I agree to the <a href="#" className="text-blue-400 hover:underline">privacy policy</a>
                        </label>
                      </div>
                      <Button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
                      >
                        Send Message
                        <Send className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">Contact Information</h3>
                <p className="text-slate-400">
                  Have questions or need assistance? Our team is here to help you with anything you need.
                </p>
                
                <div className="space-y-6">
                  {/* Turkey Office */}
                  <div className="flex items-start space-x-4 p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors duration-300">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Turkey Office</h4>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <Building className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                          <p className="text-slate-400">
                            EMNİYETTEPE MAH. SADABAT SK.<br />
                            NO: 11/1 EYÜPSULTAN / ISTANBUL / TURKEY
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-slate-400" />
                          <a href="mailto:rfq@tasavia.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                            rfq@tasavia.com
                          </a>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-slate-400" />
                          <a href="tel:+902122016000" className="text-slate-400 hover:text-blue-400 transition-colors">
                            +90 212 201 6000
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* USA Office */}
                  <div className="flex items-start space-x-4 p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors duration-300">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">USA Office</h4>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <Building className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                          <p className="text-slate-400">
                            18815 LANTERN COVE LN<br />
                            TOMBALL TX 77375 USA
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-slate-400" />
                          <a href="mailto:info@tasavia.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                            info@tasavia.com
                          </a>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-slate-400" />
                          <a href="tel:+17135551234" className="text-slate-400 hover:text-blue-400 transition-colors">
                            +1 (713) 555-1234
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Social Media */}
              <div className="pt-6 border-t border-slate-800">
                <h4 className="text-lg font-semibold text-white mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                  {[
                    { name: 'LinkedIn', icon: Linkedin, url: 'https://www.linkedin.com/company/tasavia/' },
                  ].map((social) => (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 transition-all duration-200"
                      aria-label={social.name}
                    >
                      <social.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div 
            className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 md:p-12 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Get Started?</h3>
            <p className="text-blue-100 text-lg mb-8 max-w-3xl mx-auto">
              Contact our team today to discuss your aviation needs and discover how TASAVIA can help keep your aircraft flying.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-blue-50 font-medium px-8 py-6 text-base"
              >
                <Mail className="mr-2 h-5 w-5" />
                Request a Quote
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-medium px-8 py-6 text-base"
              >
                <Phone className="mr-2 h-5 w-5" />
                Call Us Now
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="text-white text-lg font-semibold mb-4">About Us</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Our Story</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Our Team</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">News & Media</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Aircraft Maintenance</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Parts & Components</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Technical Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Consulting</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support Center</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sitemap</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-6 mb-6 md:mb-0">
              <a href="https://www.linkedin.com/company/tasavia/" className="text-slate-400 hover:text-white transition-colors">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} TASAVIA. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <Badge className="bg-blue-600 text-white">
                <Award className="h-4 w-4 mr-1" />
                ISO9001 Certified
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}