"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Recycle, Shirt, Handshake, Globe } from "@/components/icons" // Updated import path
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="px-4 lg:px-6 h-14 flex items-center justify-between bg-white shadow-sm">
        <Link href="/" className="flex items-center space-x-2">
          <Recycle className="h-6 w-6 text-green-600" />
          <span className="text-xl font-bold text-gray-900">ReWear</span>
        </Link>
        <nav className="flex gap-4 sm:gap-6">
          <Link href="/browse" className="text-sm font-medium hover:underline underline-offset-4 text-gray-700">
            Browse
          </Link>
          <Link href="/how-it-works" className="text-sm font-medium hover:underline underline-offset-4 text-gray-700">
            How it Works
          </Link>
          <Link href="/about" className="text-sm font-medium hover:underline underline-offset-4 text-gray-700">
            About
          </Link>
          <Link href="/contact" className="text-sm font-medium hover:underline underline-offset-4 text-gray-700">
            Contact
          </Link>
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4 text-green-600">
            Login
          </Link>
          <Link href="/register" className="text-sm font-medium hover:underline underline-offset-4 text-green-600">
            Register
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex-1 flex items-center justify-center">
        <div className="container px-4 md:px-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-gray-900">
              Swap, Refresh, Sustain.
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-700 md:text-xl">
              Discover a new way to refresh your wardrobe sustainably. Swap clothes with others and give your items a
              second life.
            </p>
            <div className="space-x-4">
              <Link
                href="/register"
                className="inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-700"
              >
                Get Started
              </Link>
              <Link
                href="/browse"
                className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
              >
                Browse Items
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg shadow-sm">
              <Shirt className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Discover Unique Styles</h3>
              <p className="text-gray-600">Find pre-loved fashion gems that fit your unique taste and style.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg shadow-sm">
              <Handshake className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Easy Swapping Process</h3>
              <p className="text-gray-600">Connect with other fashion enthusiasts and arrange hassle-free swaps.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg shadow-sm">
              <Globe className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Sustainable Fashion</h3>
              <p className="text-gray-600">Reduce textile waste and contribute to a more sustainable planet.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900 mb-8">
            How ReWear Works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="text-2xl text-green-600">1. List Your Items</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-700">
                  Upload photos and details of clothes you no longer wear.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="text-2xl text-green-600">2. Find Your Next Look</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-700">
                  Browse items listed by others and find something you love.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="text-2xl text-green-600">3. Swap & Enjoy</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-700">
                  Connect with swappers, arrange the exchange, and refresh your wardrobe!
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-green-600 text-white">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">Ready to ReWear?</h2>
          <p className="mx-auto max-w-[700px] text-green-100 md:text-xl mb-8">
            Join our community today and start swapping your way to a more sustainable wardrobe.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-green-700 shadow transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              Sign Up Now
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-10 items-center justify-center rounded-md border border-white px-8 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900 mb-4">
            Stay Updated
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-700 md:text-xl mb-8">
            Subscribe to our newsletter for the latest updates, fashion tips, and sustainable living advice.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Label htmlFor="email-newsletter" className="sr-only">
              Email
            </Label>
            <Input
              id="email-newsletter"
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-md border border-gray-300 focus:ring-green-600 focus:border-green-600"
            />
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md">
              Subscribe
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-gray-500">&copy; 2024 ReWear. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="/terms" className="text-xs hover:underline underline-offset-4 text-gray-600">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-xs hover:underline underline-offset-4 text-gray-600">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
