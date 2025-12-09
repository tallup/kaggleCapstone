<?php

namespace Database\Seeders;

use App\Models\PharmacySupplier;
use App\Models\User;
use Illuminate\Database\Seeder;

class PharmacySupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')
            ->orWhere('role', 'administrator')
            ->first();

        $suppliers = [
            [
                'name' => 'ABC Pharmaceuticals',
                'contact_person' => 'John Smith',
                'phone' => '(555) 123-4567',
                'email' => 'orders@abcpharma.com',
                'address' => '123 Main Street',
                'city' => 'Seattle',
                'state' => 'WA',
                'zip' => '98101',
                'fax' => '(555) 123-4568',
                'license_number' => 'PH-12345',
                'default_discount' => 5.00,
                'payment_terms_days' => 30,
                'is_active' => true,
                'notes' => 'Preferred supplier for general medications',
            ],
            [
                'name' => 'MedSupply Co.',
                'contact_person' => 'Sarah Johnson',
                'phone' => '(555) 234-5678',
                'email' => 'contact@medsupply.com',
                'address' => '456 Oak Avenue',
                'city' => 'Portland',
                'state' => 'OR',
                'zip' => '97201',
                'fax' => '(555) 234-5679',
                'license_number' => 'PH-23456',
                'default_discount' => 7.50,
                'payment_terms_days' => 45,
                'is_active' => true,
                'notes' => 'Specializes in controlled substances',
            ],
            [
                'name' => 'Quality Medical Supply',
                'contact_person' => 'Michael Brown',
                'phone' => '(555) 345-6789',
                'email' => 'info@qualitymed.com',
                'address' => '789 Pine Road',
                'city' => 'Vancouver',
                'state' => 'WA',
                'zip' => '98660',
                'fax' => '(555) 345-6790',
                'license_number' => 'PH-34567',
                'default_discount' => 3.00,
                'payment_terms_days' => 30,
                'is_active' => true,
                'notes' => 'Bulk orders available with discounts',
            ],
            [
                'name' => 'Express Pharmacy Services',
                'contact_person' => 'Emily Davis',
                'phone' => '(555) 456-7890',
                'email' => 'orders@expresspharm.com',
                'address' => '321 Elm Street',
                'city' => 'Spokane',
                'state' => 'WA',
                'zip' => '99201',
                'fax' => '(555) 456-7891',
                'license_number' => 'PH-45678',
                'default_discount' => 10.00,
                'payment_terms_days' => 15,
                'is_active' => true,
                'notes' => 'Fast delivery, emergency orders available',
            ],
            [
                'name' => 'HealthCare Distributors',
                'contact_person' => 'Robert Wilson',
                'phone' => '(555) 567-8901',
                'email' => 'sales@healthcare-dist.com',
                'address' => '654 Maple Drive',
                'city' => 'Tacoma',
                'state' => 'WA',
                'zip' => '98401',
                'fax' => '(555) 567-8902',
                'license_number' => 'PH-56789',
                'default_discount' => 5.00,
                'payment_terms_days' => 30,
                'is_active' => false,
                'notes' => 'Temporarily inactive - contact before ordering',
            ],
        ];

        foreach ($suppliers as $supplier) {
            PharmacySupplier::create([
                ...$supplier,
                'created_by' => $admin->id ?? 1,
            ]);
        }
    }
}




























