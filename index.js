const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config({ path: 'aaa.env' });
const moment = require('moment-timezone');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const jwt = require('jsonwebtoken');

// Tambahkan ini di bagian atas file index.js
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Pastikan direktori ini ada
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Menyimpan file dengan nama unik dan ekstensi yang benar
    }
});

const upload = multer({ storage: storage });

const app = express();
const port = 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Pastikan jalur views benar

moment.tz.setDefault('Asia/Makassar');

// Middleware untuk parsing data dari body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware untuk mengurai cookie
app.use(cookieParser());

// Middleware untuk melayani file statis dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Koneksi ke database
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Menghubungkan ke database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.stack);
        return;
    }
    console.log('Terhubung ke database MySQL sebagai ID ' + connection.threadId);
});

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    console.log('Token yang diterima:', req.cookies.token);

    if (!token) {
        return res.redirect('/login');  // Jika token tidak ada, redirect ke login
    }

    jwt.verify(token, 'secretKey', (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = decoded;  // Simpan data pengguna yang terdekode
        next();
    });
};

// ------------------------------------------------------------------------------------------------------------------//

// Pastikan ini diubah untuk menangani file
   function isValidDate(dateString) {
       return moment(dateString, 'YYYY-MM-DD', true).isValid();
   }

app.get('/flight-reports', (req, res) => {
    const sql = 'SELECT * FROM flight_reports ORDER BY date DESC'; // Mengambil data dari tabel flight_reports
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err.message); // Log jika ada error pada database
            return res.status(500).json({ error: err.message });
        }

        // Log data yang diambil dari database sebelum diformat
        //console.log('Raw data from database:', results);

        // Format tanggal sesuai zona waktu yang diinginkan (Asia/Makassar)
        const formattedResults = results.map(report => {
            const originalDate = moment(report.date).utc(); // Anggap tanggal disimpan dalam UTC
            const formattedDate = originalDate.tz('Asia/Makassar').format('YYYY-MM-DD'); // Konversi ke WITA
            //console.log('Original date (UTC):', originalDate.format('YYYY-MM-DD'));
            //console.log('Formatted date (WITA):', formattedDate);
            return {
                ...report,
                date: formattedDate
            };
        });

        //console.log('Formatted data:', formattedResults); // Log data setelah diformat
        res.json(formattedResults); // Mengembalikan data laporan yang sudah diformat
    });
});

app.post('/api/flight-reports', upload.single('proof'), (req, res) => {
    const { date, flight, ft, nickname } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
    }

    if (!date || !flight || !ft || !nickname) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Validasi format tanggal
    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'Please input date by YYYY-MM-DD format' });
    }

    const proof = req.file.filename;

    // Cek apakah nickname terdaftar di tabel users
    const userQuery = 'SELECT * FROM users WHERE nickname = ?';
    connection.query(userQuery, [nickname], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(400).json({ error: 'Nickname are not registered' });
        }

        // Cek apakah laporan sudah ada
        const reportQuery = 'SELECT * FROM flight_reports WHERE date = ? AND nickname = ?';
        connection.query(reportQuery, [date, nickname], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (results.length > 0) {
                return res.status(400).json({ error: 'Report for this date and nickname already exists.' });
            }

            // Jika tidak ada duplikasi, lanjutkan menyimpan laporan
            const insertQuery = 'INSERT INTO flight_reports (date, flight, ft, nickname, proof) VALUES (?, ?, ?, ?, ?)';
            connection.query(insertQuery, [date, flight, ft, nickname, proof], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Add report failed: ' + err.message });
                }
                res.json({ message: 'Report submitted successfully!', report: { date, flight, ft, nickname, proof } });
            });
        });
    });
});

// ------------------------------------------------------------------------------------------------------------------//

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Rute untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', verifyToken, (req, res) => {
    res.send(`Welcome to the dashboard, ${req.user.email}`);
});

app.get('/flight-plan', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'flight-plan.html')); // Atau bisa diarahkan ke file terpisah jika ada
});

app.get('/flight-report', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'flight-report.html'));
});

// Rute untuk halaman FLOPS
app.get('/flops', (req, res) => {
    res.render('flops');  // Merender file flops.ejs
});

// ------------------------------------------------------------------------------------------------------------------//

let airports;
fs.readFile(path.join(__dirname, 'airports.json'), 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    airports = JSON.parse(data);
});

// Fungsi untuk mendapatkan data bandara berdasarkan kode ICAO
function getAirportData(airportCode) {
    return airports[airportCode] || null;
}

// Rute untuk menampilkan detail bandara
app.get('/flops/:airportCode', (req, res) => {
    const airportCode = req.params.airportCode;
    const airportData = getAirportData(airportCode);

    if (airportData) {
        res.render('airport-details', { airportCode, airportData });
    } else {
        res.status(404).send('Bandara tidak ditemukan');
    }
})

// ------------------------------------------------------------------------------------------------------------------//

// Temporary storage for verification codes
const verificationCodes = {};

// Fungsi untuk memeriksa kekuatan password
function isPasswordStrong(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
}

app.post('/register', async (req, res) => {
    const { email, nickname, verificationCode, password } = req.body;

    if (password.length < 8) {
            return res.status(400).json({ message: 'Password lemah' });
        }

    // Validasi kode verifikasi
    if (verificationCode !== verificationCodes[email]) {
        return res.status(400).json({ message: 'Kode verifikasi tidak valid!' });
    }

    // Validasi kekuatan password
    if (!isPasswordStrong(password)) {
        return res.status(400).json({ message: 'Password harus minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, dan simbol.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (email, nickname, password) VALUES (?, ?, ?)';

        connection.query(query, [email, nickname, hashedPassword], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Terjadi kesalahan saat mendaftar!' });
            }

            delete verificationCodes[email];
            res.json({ message: 'Pendaftaran berhasil!' });
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mendaftar!' });
    }
});

// Menangani data login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    connection.query(query, [email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Terjadi kesalahan saat login!' });
        }

        if (results.length > 0) {
            const user = results[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (isPasswordValid) {
                const token = jwt.sign({ id: user.id, email: user.email }, 'secretKey', { expiresIn: '1h' });
                console.log('Token:', token);
                res.clearCookie('token');
                res.cookie('token', token, { httpOnly: false, maxAge: 3600000 });
                return res.json({ message: 'Login Berhasil!', redirect: '/' });
            }
        }

        return res.status(401).json({ message: 'Login gagal! Email atau password salah.' });
    });
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Konfigurasi Nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Fungsi untuk mengirim kode verifikasi
const sendVerificationCode = async (email, verificationCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Kode Verifikasi',
        text: `Kode verifikasi Anda adalah: ${verificationCode}`
    };

    return transporter.sendMail(mailOptions);
};

// Endpoint untuk mengirim kode verifikasi
app.post('/send-verification-code', async (req, res) => {
    const { email } = req.body;

    const userQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(userQuery, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Gagal memeriksa email.' });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'Email sudah terdaftar.' });
        }

        const verificationCode = crypto.randomBytes(3).toString('hex');
        verificationCodes[email] = verificationCode;

        try {
            await sendVerificationCode(email, verificationCode);
            res.json({ message: 'Kode verifikasi telah dikirim ke email Anda.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Gagal mengirim kode verifikasi.' });
        }
    });
});

// Endpoint untuk validasi kode verifikasi
app.post('/validate-verification-code', (req, res) => {
    const { email, code } = req.body;

    if (verificationCodes[email] === code) {
        delete verificationCodes[email];
        res.json({ message: 'Kode verifikasi berhasil divalidasi.' });
    } else {
        res.status(400).json({ message: 'Kode verifikasi tidak valid!' });
    }
});

// ------------------------------------------------------------------------------------------------------------------//

// Rute untuk menyajikan halaman myaccount.html
app.get('/myaccount', verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'myaccount.html'));
});

// Rute untuk mengambil data pengguna
app.get('/myaccount/data', verifyToken, (req, res) => {
    const email = req.user.email;
    const query = 'SELECT * FROM users WHERE email = ?';

    console.log('User email:', req.user.email);
    connection.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data pengguna.' });
        }
        //console.log('Results from database:', results);

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
    });
});

app.post('/logout', (req, res) => {
    res.clearCookie('token'); // Menghapus cookie token
    return res.json({ message: 'Logout berhasil!' });
});

// ------------------------------------------------------------------------------------------------------------------//

app.get('/current-time', (req, res) => {
    const currentTime = moment().tz('Asia/Makassar').format('YYYY-MM-DD HH:mm:ss');
    res.json({ currentTime });
});

// Memulai server
app.listen(port, () => {
    console.log(`Terhubung ke server http://localhost:${port}/`);
});
