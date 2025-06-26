import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  Star,
  ArrowRight,
  Smartphone,
  Globe,
  Shield,
  Zap
} from 'lucide-react'
import { Button } from '../components/ui/Button'

export const LandingPage = () => {
  const [email, setEmail] = useState('')

  const features = [
    {
      icon: Calendar,
      title: "Smart Family Calendar",
      description: "Keep everyone's schedules in sync with color-coded events, recurring appointments, and automatic holiday integration."
    },
    {
      icon: Users,
      title: "Family Member Management", 
      description: "Add all family members, pets, and caregivers with custom roles and permissions for complete household coordination."
    },
    {
      icon: Clock,
      title: "Event Assignment & Reminders",
      description: "Assign events to specific family members and designate drivers/helpers to ensure nothing falls through the cracks."
    },
    {
      icon: Smartphone,
      title: "Multiple Calendar Views",
      description: "Switch between weekly, daily, simplified, and list views to see your schedule exactly how you prefer."
    },
    {
      icon: Globe,
      title: "Export & Sync",
      description: "Export your family calendar to any device or platform. Keep everyone connected across all their devices."
    },
    {
      icon: Shield,
      title: "Private & Secure",
      description: "Your family's information is protected with enterprise-grade security. Only your family can see your events."
    }
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Mom of 3",
      content: "Finally, a calendar that works for our chaotic family life! Everyone knows where they need to be and when.",
      rating: 5
    },
    {
      name: "Mike Chen",
      role: "Busy Dad",
      content: "The driver assignment feature is a game-changer. No more confusion about who's picking up the kids.",
      rating: 5
    },
    {
      name: "Lisa Rodriguez",
      role: "Working Parent",
      content: "Love how it automatically includes holidays and lets us plan around them. So much easier than juggling multiple calendars.",
      rating: 5
    }
  ]

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, just redirect to signup with email pre-filled
    window.location.href = `/auth?email=${encodeURIComponent(email)}`
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Family Scheduler</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/auth" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
              <Link to="/auth">
                <Button size="sm">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Keep Your Family 
              <span className="text-blue-600"> Organized</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The only family calendar you'll ever need. Coordinate schedules, assign responsibilities, 
              and never miss another important event. Built for busy families who want to stay connected.
            </p>
            
            {/* Email Signup */}
            <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto mb-8">
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <Button type="submit" size="lg">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
            
            <p className="text-sm text-gray-500">
              ✨ <strong>Free 30-day trial</strong> • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything Your Family Needs
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed specifically for families who want to stay organized 
              and connected without the complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <div key={index} className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
                  <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4">
                    <IconComponent className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Stop Juggling Multiple Calendars
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Tired of checking three different apps to see if everyone's free on Saturday? 
                Family Scheduler brings everyone together in one beautiful, easy-to-use calendar.
              </p>
              
              <div className="space-y-4">
                {[
                  "See everyone's schedule at a glance",
                  "Automatically sync with existing calendars", 
                  "Get reminders for important family events",
                  "Coordinate carpools and responsibilities",
                  "Never double-book family time again"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-blue-900">Soccer Practice</span>
                  <span className="text-sm text-blue-600">Emma • 4:00 PM</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-green-900">Piano Lesson</span>
                  <span className="text-sm text-green-600">Alex • 5:30 PM</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-purple-900">Family Dinner</span>
                  <span className="text-sm text-purple-600">Everyone • 7:00 PM</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="font-medium text-orange-900">🚗 Pickup: Mom</span>
                  <span className="text-sm text-orange-600">Soccer → Piano</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Loved by Families Everywhere
            </h2>
            <p className="text-lg text-gray-600">
              See what other families are saying about Family Scheduler
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="p-6 border border-gray-200 rounded-xl">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Your Family Organized?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of families who have simplified their lives with Family Scheduler.
            Start your free trial today – no credit card required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-50">
                <Zap className="h-5 w-5 mr-2" />
                Start Free Trial
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-700">
                Sign In
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-blue-200 mt-6">
            30-day free trial • No setup fees • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">Family Scheduler</span>
              </div>
              <p className="text-gray-400">
                The easiest way to keep your family organized and connected.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Family Scheduler. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}