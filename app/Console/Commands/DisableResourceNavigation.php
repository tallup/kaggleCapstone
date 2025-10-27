<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class DisableResourceNavigation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'navigation:disable-resources';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Disable navigation registration for all Filament resources';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Disabling navigation for all Filament resources...');
        
        $resourcePath = app_path('Filament/Resources');
        $files = File::allFiles($resourcePath);
        
        $updated = 0;
        
        foreach ($files as $file) {
            if ($file->getExtension() === 'php') {
                $content = File::get($file->getPathname());
                
                // Check if it's a resource file and has shouldRegisterNavigation method
                if (strpos($content, 'extends Resource') !== false && 
                    strpos($content, 'shouldRegisterNavigation') !== false) {
                    
                    // Replace shouldRegisterNavigation to return false
                    $newContent = preg_replace(
                        '/public static function shouldRegisterNavigation\(\): bool\s*\{\s*return true;\s*\}/',
                        'public static function shouldRegisterNavigation(): bool' . PHP_EOL . '    {' . PHP_EOL . '        return false;' . PHP_EOL . '    }',
                        $content
                    );
                    
                    if ($newContent !== $content) {
                        File::put($file->getPathname(), $newContent);
                        $updated++;
                        $this->line("Updated: " . $file->getFilename());
                    }
                }
            }
        }
        
        $this->info("Updated {$updated} resource files to disable navigation registration.");
        $this->info('All Filament resources will now use custom navigation only.');
        
        return 0;
    }
}
