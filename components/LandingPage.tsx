"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Recycle, Search, Heart, Users, Leaf, Star, ArrowRight, ShoppingBag, Plus, TrendingUp, Award, Globe } from 'lucide-react'

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const featuredItems = [
    {
      id: 1,
      title: "Vintage Denim Jacket",
      category: "Outerwear",
      size: "M",
      condition: "Good",
      points: 85,
      image: "/placeholder.svg?height=300&width=300",
      owner: "Sarah M.",
    },
    {
      id: 2,
      title: "Designer Silk Blouse",
      category: "Tops",
      size: "S",
      condition: "Like New",
      points: 120,
      image: "/placeholder.svg?height=300&width=300",
      owner: "Emma K.",
    },
    {
      id: 3,
      title: "Leather Ankle Boots",
      category: "Shoes",
      size: "8",
      condition: "Good",
      points: 95,
      image: "/placeholder.svg?height=300&width=300",
      owner: "Alex R.",
    },
    {
      id: 4,
      title: "Floral Summer Dress",
      category: "Dresses",
      size: "L",
      condition: "New",
      points: 110,
      image: "/placeholder.svg?height=300&width=300",
      owner: "Maya P.",
    },
  ]

  const categories = [
    { name: "Tops", icon: "👕", count: 245 },
    { name: "Bottoms", icon: "👖", count: 189 },
    { name: "Dresses", icon: "👗", count: 156 },
    { name: "Outerwear", icon: "🧥", count: 98 },
    { name: "Shoes", icon: "👠", count: 167 },
    { name: "Accessories", icon: "👜", count: 134 },
  ]

  const testimonials = [
    {
      name: "Jessica Chen",
      avatar: "/placeholder-user.jpg",
      rating: 5,
      text: "ReWear has completely changed how I think about fashion. I've swapped over 20 items and saved hundreds of dollars!",
    },
    {
      name: "Michael Torres",
      avatar: "/placeholder-user.jpg",
      rating: 5,
      text: "The point system is genius. I can earn points by listing items I don't wear and use them to get things I actually need.",
    },
    {
      name: "Amanda Foster",
      avatar: "/placeholder-user.jpg",
      rating: 5,
      text: "Love the community aspect! I've met so many like-minded people who care about sustainable fashion.",
    },
  ]

  const stats = [
    { label: "Items Swapped", value: "15,000+", icon: Recycle },
    { label: "Active Members", value: "5,000+", icon: Users },
    { label: "CO₂ Saved", value: "2.5 tons", icon: Leaf },
    { label: "Average Rating", value: "4.9/5", icon: Star },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Recycle className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">ReWear</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/browse" className="text-gray-600 hover:text-green-600 transition-colors">
                Browse Items
              </Link>
              <Link href="/how-it-works" className="text-gray-600 hover:text-green-600 transition-colors">
                How It Works
              </Link>
              <Link href="/community" className="text-gray-600 hover:text-green-600 transition-colors">
                Community
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-green-600">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-green-600 hover:bg-green-700">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Sustainable Fashion
              <span className="text-green-600 block">Made Simple</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of fashion lovers who are reducing waste and discovering unique pieces through our
              community-driven clothing exchange platform.
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search for items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full rounded-full border-2 border-green-200 focus:border-green-500"
                />
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/browse">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Start Swapping
                </Button>
              </Link>
              <Link href="/browse">
                <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 text-lg">
                  Browse Items
                </Button>
              </Link>
              <Link href="/add-item">
                <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 text-lg">
                  <Plus className="mr-2 h-5 w-5" />
                  List an Item
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                    <stat.icon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items Carousel */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Items</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover amazing pieces from our community. Each item is carefully reviewed to ensure quality and
              authenticity.
            </p>
          </div>

          <Carousel className="max-w-5xl mx-auto">
            <CarouselContent>
              {featuredItems.map((item) => (
                <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative overflow-hidden rounded-t-lg">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-white/90">
                          {item.condition}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span>{item.category}</span>
                        <span>Size {item.size}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className="font-semibold text-green-600">{item.points} points</span>
                        </div>
                        <span className="text-sm text-gray-500">by {item.owner}</span>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>

          <div className="text-center mt-8">
            <Link href="/browse">
              <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                View All Items
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
            <p className="text-gray-600">Find exactly what you're looking for in our organized categories</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category, index) => (
              <Link key={index} href={`/browse?category=${category.name.toLowerCase()}`}>
                <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                      {category.icon}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.count} items</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How ReWear Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Getting started with sustainable fashion has never been easier. Follow these simple steps to begin your
              journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Plus className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">1. List Your Items</h3>
              <p className="text-gray-600">
                Upload photos and details of clothing items you no longer wear. Our community will review and approve
                quality items.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Search className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Browse & Request</h3>
              <p className="text-gray-600">
                Discover amazing pieces from other members. Request swaps directly or use points to redeem items you
                love.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Recycle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Swap & Enjoy</h3>
              <p className="text-gray-600">
                Complete the exchange with other members and enjoy your new-to-you fashion finds while helping the
                environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-green-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Community Says</h2>
            <p className="text-gray-600">Join thousands of satisfied members who are making a difference</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <img
                      src={testimonial.avatar || "/placeholder.svg"}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                      <div className="flex items-center">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 italic">"{testimonial.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-green-600">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Your Sustainable Fashion Journey?</h2>
            <p className="text-green-100 text-lg mb-8">
              Join our community today and discover a new way to refresh your wardrobe while helping the planet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3 text-lg">
                  Join ReWear Today
                </Button>
              </Link>
              <Link href="/browse">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-green-600 px-8 py-3 text-lg"
                >
                  Explore Items
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Recycle className="h-6 w-6 text-green-400" />
                <span className="text-xl font-bold">ReWear</span>
              </div>
              <p className="text-gray-400 mb-4">
                Making sustainable fashion accessible to everyone through community-driven clothing exchange.
              </p>
              <div className="flex space-x-4">
                <Globe className="h-5 w-5 text-gray-400 hover:text-green-400 cursor-pointer" />
                <Heart className="h-5 w-5 text-gray-400 hover:text-green-400 cursor-pointer" />
                <Users className="h-5 w-5 text-gray-400 hover:text-green-400 cursor-pointer" />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/browse" className="hover:text-white transition-colors">
                    Browse Items
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/mobile" className="hover:text-white transition-colors">
                    Mobile App
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Community</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/community" className="hover:text-white transition-colors">
                    Community
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/events" className="hover:text-white transition-colors">
                    Events
                  </Link>
                </li>
                <li>
                  <Link href="/sustainability" className="hover:text-white transition-colors">
                    Sustainability
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/help" className="hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ReWear. All rights reserved. Made with ❤️ for sustainable fashion.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
