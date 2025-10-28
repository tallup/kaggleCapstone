<x-filament-panels::page.simple>
    <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#F5F5DC] to-[#E6E6D4]">
        <!-- Logo Section -->
        <div class="mb-8 text-center">
            <img src="{{ asset('images/logo.png') }}" alt="Evergreen Oasis Care Home" class="mx-auto h-32 w-auto mb-4">
            <h1 class="text-3xl font-bold text-[#8B4513] mb-2">Evergreen Oasis Care Home</h1>
            <p class="text-lg text-[#2D5016] italic">Where Home Feels Like Home</p>
        </div>

        <!-- Login Form Card -->
        <div class="w-full max-w-md bg-white rounded-lg shadow-lg border-2 border-[#2D5016] p-8">
            <div class="text-center mb-6">
                <h2 class="text-2xl font-semibold text-[#2D5016]">Welcome Back</h2>
                <p class="text-[#8B4513] mt-2">Please sign in to your account</p>
            </div>

            {{ $this->form }}

            <div class="mt-6 text-center">
                <p class="text-sm text-[#8B4513]">
                    Need help? Contact your administrator
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div class="mt-8 text-center">
            <p class="text-sm text-[#8B4513]">
                © {{ date('Y') }} Evergreen Oasis Care Home. All rights reserved.
            </p>
        </div>
    </div>
</x-filament-panels::page.simple>
