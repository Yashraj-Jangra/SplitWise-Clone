
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getGroupCoverImages, updateGroupCoverImages } from '@/lib/mock-data';
import { uploadFile } from '@/lib/storage';
import { X } from 'lucide-react';
import Image from 'next/image';

export default function AdminSettingsPage() {
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchCovers() {
      setLoading(true);
      const images = await getGroupCoverImages();
      setCoverImages(images);
      setLoading(false);
    }
    fetchCovers();
  }, []);

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...coverImages];
    newImages[index] = value;
    setCoverImages(newImages);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = coverImages.filter((_, i) => i !== index);
    setCoverImages(newImages);
  };

  const handleAddImage = () => {
    if (newImageUrl && !coverImages.includes(newImageUrl)) {
      setCoverImages([...coverImages, newImageUrl]);
      setNewImageUrl('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Please enter a valid and unique image URL.',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 1024 * 1024 * 5) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Please select an image smaller than 5MB.' });
      return;
    }
    setIsUploading(true);
    try {
      const downloadURL = await uploadFile(file, `default-covers`);
      setCoverImages([...coverImages, downloadURL]);
      toast({ title: 'Upload Successful', description: 'Image added to the list. Remember to save changes.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the image.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await updateGroupCoverImages(coverImages);
      toast({
        title: 'Settings Saved',
        description: 'Default group cover images have been updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video w-full rounded-md" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coverImages.map((url, index) => (
            <div key={index} className="relative group space-y-2">
              <div className="relative aspect-video w-full overflow-hidden rounded-md">
                <Image src={url} alt={`Cover ${index + 1}`} fill className="object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={url}
                onChange={(e) => handleImageChange(index, e.target.value)}
                placeholder="Image URL"
              />
            </div>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Add New Image</CardTitle>
            <CardDescription>Add a new image by pasting a URL or uploading a file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/image.png"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
              />
              <Button onClick={handleAddImage}>Add by URL</Button>
            </div>
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Icons.AppLogo className="animate-spin mr-2" /> : <Icons.Upload className="mr-2" />}
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline text-foreground">Site Settings</h1>
        <p className="text-muted-foreground">Manage application-wide configurations.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Default Group Cover Images</CardTitle>
          <CardDescription>These images are used as default covers when creating new groups.</CardDescription>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSaveChanges} disabled={isSaving || loading}>
          {isSaving ? <Icons.AppLogo className="animate-spin mr-2" /> : null}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
