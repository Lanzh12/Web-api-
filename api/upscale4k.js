/*
📌 REST API: AI Upscale Image
🌐 Source API: https://fooocus.one
👨‍💻 Author: SaaOfc + Mod by ChatGPT
*/

const express = require('express');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Endpoint: POST /upscale
router.post('/upscale', upload.single('image'), async (req, res) => {
    const { scale = 4, faceEnhance = 'true' } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
        return res.status(400).json({ status: false, message: 'Gambar wajib diupload (field: image)' });
    }

    const scaleNum = parseInt(scale);
    const faceEnhanceBool = faceEnhance === 'true';

    if (isNaN(scaleNum) || scaleNum < 2 || scaleNum > 10) {
        return res.status(400).json({ status: false, message: 'Scale harus antara 2-10' });
    }

    try {
        // Konversi ke Base64
        const fileBuffer = fs.readFileSync(imageFile.path);
        const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

        // Kirim request ke fooocus API
        const start = await axios.post(
            'https://fooocus.one/api/predictions',
            {
                version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
                input: {
                    face_enhance: faceEnhanceBool,
                    image: base64Image,
                    scale: scaleNum
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'https://fooocus.one',
                    'Referer': 'https://fooocus.one/id/apps/batch-upscale-image'
                }
            }
        );

        const predictionId = start.data.data.id;

        // Polling sampai status success
        let result;
        while (true) {
            const statusCheck = await axios.get(`https://fooocus.one/api/predictions/${predictionId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': 'https://fooocus.one/id/apps/batch-upscale-image'
                }
            });

            if (statusCheck.data.status === 'succeeded') {
                result = statusCheck.data.output;
                break;
            } else if (statusCheck.data.status === 'failed') {
                throw new Error('Upscale gagal');
            }

            await new Promise(r => setTimeout(r, 3000));
        }

        // Hapus file setelah proses
        fs.unlinkSync(imageFile.path);

        // Kirim response hasil
        return res.json({
            status: true,
            scale: scaleNum,
            faceEnhance: faceEnhanceBool,
            result: result[0] // link hasil upscale
        });

    } catch (error) {
        console.error('[API ERROR]', error.message);
        return res.status(500).json({ status: false, message: 'Gagal memproses upscale.' });
    }
});

module.exports = router;