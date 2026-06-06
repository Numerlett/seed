import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useToast } from './ui';
import { trpc } from '../lib/trpc';
import { putToPresignedUrl } from '../lib/s3';
import { errorMessage } from '../lib/utils';

export function ImageUploadField({
  value,
  onChange,
  label = 'Image',
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const presign = trpc.s3.getPresignedUrl.useMutation();

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error('Photo library permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const contentType = asset.mimeType ?? 'image/jpeg';
    const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;

    try {
      setUploading(true);
      const presigned = await presign.mutateAsync({
        fileName,
        contentType,
        isPublic: true,
      });
      await putToPresignedUrl(presigned.uploadUrl, asset.uri, contentType);
      if (presigned.publicUrl) {
        onChange(presigned.publicUrl);
        toast.success('Image uploaded');
      }
    } catch (e) {
      toast.error(errorMessage(e, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      {value ? (
        <View className="flex-row items-center gap-3">
          <Image
            source={{ uri: value }}
            style={{ width: 72, height: 72, borderRadius: 12 }}
            contentFit="cover"
          />
          <Pressable
            onPress={() => onChange(undefined)}
            className="flex-row items-center gap-1 rounded-lg border border-border px-3 py-2"
          >
            <X size={14} color="#dc2626" />
            <Text className="text-sm text-destructive">Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={pick}
          disabled={uploading}
          className="h-20 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted active:opacity-70"
        >
          {uploading ? (
            <ActivityIndicator color="#1c1917" />
          ) : (
            <>
              <ImagePlus size={20} color="#78716c" />
              <Text className="text-sm text-muted-foreground">Upload image</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}
