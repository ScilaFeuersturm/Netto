package com.example.netto.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.core.content.FileProvider
import java.io.File

private const val MAX_DIMENSION = 2200

/**
 * Decodifica un [Uri] (foto de cámara o galería) a [Bitmap], corrigiendo la rotación EXIF
 * (muchas cámaras guardan la orientación como metadato en vez de rotar los píxeles, lo que
 * arruina el reconocimiento de texto si no se corrige) y limitando el tamaño máximo.
 */
fun decodeBitmapFromUri(context: Context, uri: Uri): Bitmap? = try {
    val raw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        val source = ImageDecoder.createSource(context.contentResolver, uri)
        ImageDecoder.decodeBitmap(source) { decoder, _, _ ->
            decoder.isMutableRequired = true
            decoder.setTargetSampleSize(1)
        }
    } else {
        @Suppress("DEPRECATION")
        MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
    }
    val rotated = applyExifRotation(context, uri, raw)
    downscaleIfNeeded(rotated)
} catch (e: Exception) {
    null
}

private fun applyExifRotation(context: Context, uri: Uri, bitmap: Bitmap): Bitmap {
    val orientation = try {
        context.contentResolver.openInputStream(uri)?.use { stream ->
            ExifInterface(stream).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL,
            )
        } ?: ExifInterface.ORIENTATION_NORMAL
    } catch (e: Exception) {
        ExifInterface.ORIENTATION_NORMAL
    }

    val degrees = when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
        else -> 0f
    }
    if (degrees == 0f) return bitmap
    val matrix = Matrix().apply { postRotate(degrees) }
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
}

private fun downscaleIfNeeded(bitmap: Bitmap): Bitmap {
    val largestSide = maxOf(bitmap.width, bitmap.height)
    if (largestSide <= MAX_DIMENSION) return bitmap
    val scale = MAX_DIMENSION.toFloat() / largestSide
    val newWidth = (bitmap.width * scale).toInt().coerceAtLeast(1)
    val newHeight = (bitmap.height * scale).toInt().coerceAtLeast(1)
    return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
}

/** Crea un archivo temporal en caché y devuelve un [Uri] de contenido (vía FileProvider) para que la cámara escriba la foto en resolución completa. */
fun createCameraCaptureUri(context: Context): Uri {
    val photoFile = File.createTempFile("netto_invoice_", ".jpg", context.cacheDir)
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", photoFile)
}
