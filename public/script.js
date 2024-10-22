                                 // Toggle menu main page //

function toggleMenu() {
    const menu = document.getElementById("menu");
    menu.classList.toggle("open");
}

function closeMenu() {
    document.getElementById('menu').classList.remove('open');
}

// ------------------------------------------------------------------------------------------------------------------ //

                                 // Access Control //

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// script.js
document.addEventListener('DOMContentLoaded', () => {
    const token = getCookie('token'); // Ambil token dari cookie
    //console.log('Semua cookie:', document.cookie); // Debug semua cookie
    //console.log('Token:', token); // Log token

    if (token) {
        //console.log('Token ditemukan, menyembunyikan tombol register');
        const menuRegister = document.getElementById('menuRegister');
        const bannerRegister = document.getElementById('bannerRegister');

        if (menuRegister) menuRegister.style.display = 'none';
        if (bannerRegister) bannerRegister.style.display = 'none'

        // Panggil data pengguna
        fetch('/myaccount/data', {
            method: 'GET',
            credentials: 'include' // Sertakan cookie untuk otorisasi
        })
        .then(response => {
            //console.log('Status respons:', response.status); // Tambahkan log status respons
            if (!response.ok) {
                throw new Error('Terjadi kesalahan saat mengambil data pengguna.');
            }
            return response.json();
        })
        .then(data => {
            //console.log('Data lengkap:', data); // Log seluruh data
            //console.log('Nickname:', data.nickname);
            //console.log('Email:', data.email);
            //console.log('Role:', data.role);
            //console.log('Data yang diterima dari server:', data); // Log data dari server
            const nicknameElement = document.getElementById('nickname');
            const emailElement = document.getElementById('email');
            const roleElement = document.getElementById('role');

            console.log(nicknameElement, emailElement, roleElement);

            if (nicknameElement && emailElement && roleElement) {
                nicknameElement.innerText = data.nickname;
                emailElement.innerText = data.email;
                roleElement.innerText = data.role;
            } else {
                console.error('Elemen tidak ditemukan di DOM');
            }

        })
        .catch(error => {
            //console.error('Error:', error);
        });

    } else {
        //console.log('Tidak ada token'); // Log jika token tidak ada
    }
});



document.addEventListener('DOMContentLoaded', function() {
    const changeRoleButton = document.getElementById('changeRoleButton'); // Dapatkan tombol Change Role
    const modal = document.getElementById('changeRoleModal'); // Dapatkan modal
    const closeModal = document.querySelector('.close'); // Dapatkan tombol close

    // Buka modal ketika tombol "Change Role" diklik
    changeRoleButton.addEventListener('click', function(event) {
        event.preventDefault(); // Cegah aksi default dari <a> (redirect)
        modal.style.display = 'block'; // Tampilkan modal
    });

    // Tutup modal ketika tombol "X" diklik
    closeModal.addEventListener('click', function() {
        modal.style.display = 'none'; // Sembunyikan modal
    });

    // Tutup modal jika klik di luar modal
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none'; // Sembunyikan modal
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const roleButtons = document.querySelectorAll('.role-button');
    const modal = document.getElementById('changeRoleModal');

    roleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedRole = this.getAttribute('data-role');
            console.log('Selected Role:', selectedRole);
            modal.style.display = 'none'; // Tutup modal setelah memilih
            // Lakukan request AJAX atau tindakan lainnya di sini
        });
    });
});



document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.querySelector('.logoutButton'); // Menggunakan class
    const flightReportMenu = document.getElementById('menuFlightReport');
    const flopsMenu = document.getElementById('menuFlops');
    const atcMenu = document.getElementById('menuATCF');
    const logoutMenu = document.getElementById('menuLogout');

    // Menangani event klik pada tombol logout
    logoutButton.addEventListener('click', (event) => {
        event.preventDefault(); // Mencegah aksi default link
        fetch('/logout', { // Memanggil endpoint logout
            method: 'POST',
            credentials: 'include'
        })
        .then(response => {
            if (response.ok) {
                // Hapus token dari localStorage
                localStorage.removeItem('token');
                // Hapus cookie jika perlu
                document.cookie = 'token=; Max-Age=0; path=/'; // Hapus token cookie
                // Redirect ke halaman login
                window.location.href = '/index.html'; // Redirect ke halaman login
            } else {
                console.error('Logout gagal!');
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // Logika untuk menyembunyikan/menampilkan menu
    const token = localStorage.getItem('token');
    if (token) {
        flightReportMenu.style.display = 'block'; // Menampilkan menu jika ada token
        flopsMenu.style.display = 'block';
        atcMenu.style.display = 'block';
        logoutMenu.style.display = 'block';
    } else {
        flightReportMenu.style.display = 'none'; // Menyembunyikan menu jika tidak ada token
        flopsMenu.style.display = 'none';
        atcMenu.style.display = 'none';
        logoutMenu.style.display = 'none';
    }
});



// ------------------------------------------------------------------------------------------------------------------ //

                                 // flight reports //

let currentPage = 1;
const rowsPerPage = 6;
let flightReports = []; // Ganti const menjadi let agar bisa diubah
let totalPages = 0; // Inisialisasi totalPages

document.addEventListener('DOMContentLoaded', () => {
    fetch('/flight-reports') // Ambil data dari API
        .then(response => {
            console.log('Response status:', response.status); // Log status respons
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Data fetched from API:", data); // Log data yang diterima dari API

            // Periksa apakah data yang diterima tidak kosong
            if (data.length === 0) {
                console.log('No data found'); // Jika tidak ada data
                return; // Tidak lanjut jika tidak ada data
            }

            flightReports = data; // Simpan data laporan
            totalPages = Math.ceil(flightReports.length / rowsPerPage); // Hitung total halaman

            // Tampilkan data dan perbarui pagination
            displayData();
            updatePagination();
        })
        .catch(error => console.error('Error fetching reports:', error)); // Log error jika ada masalah fetching data
});

function displayData() {
    const tableBody = document.getElementById('flight-report-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Kosongkan tabel sebelum menambahkan data

    // Hitung index awal dan akhir untuk menampilkan data
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentReports = flightReports.slice(startIndex, endIndex); // Ambil data untuk halaman saat ini

    // Tambahkan data ke dalam tabel
    currentReports.forEach(report => {
        const formattedDate = report.date; // Tidak perlu konversi lagi
        const newRow = tableBody.insertRow();
        newRow.innerHTML = `
            <td>${formattedDate}</td>
            <td>${report.flight}</td>
            <td>${report.ft}</td>
            <td>${report.nickname}</td>
            <td><a href="javascript:void(0)" onclick="openModal('/uploads/${report.proof}')">See Attachment</a></td>
        `;
    });

    console.log('Table content updated:', tableBody.innerHTML); // Log konten tabel setelah diupdate
    updatePagination(); // Perbarui pagination di akhir menampilkan data
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = ''; // Kosongkan elemen pagination

    // Tombol kiri
    const prevButton = document.createElement('a');
    prevButton.textContent = '<';
    prevButton.className = 'pagination-button'; // Tambahkan kelas CSS
    if (currentPage > 1) {
        prevButton.onclick = () => changePage(currentPage - 1);
    } else {
        prevButton.classList.add('disabled'); // Tambahkan kelas 'disabled' jika tidak bisa diklik
    }
    pagination.appendChild(prevButton);

    // Menampilkan halaman saat ini
    const pageInfo = document.createElement('span');
    pageInfo.textContent = ` ${currentPage}/${totalPages} `;
    pageInfo.className = 'pagination-info'; // Tambahkan kelas CSS
    pagination.appendChild(pageInfo);

    // Tombol kanan
    const nextButton = document.createElement('a');
    nextButton.textContent = '>';
    nextButton.className = 'pagination-button'; // Tambahkan kelas CSS
    if (currentPage < totalPages) {
        nextButton.onclick = () => changePage(currentPage + 1);
    } else {
        nextButton.classList.add('disabled'); // Tambahkan kelas 'disabled' jika tidak bisa diklik
    }
    pagination.appendChild(nextButton);
}

function changePage(page) {
    if (page < 1 || page > totalPages) return; // Cek apakah halaman valid
    currentPage = page;
    displayData(); // Tampilkan data pada halaman yang dipilih
}

window.onload = () => {
    displayData(); // Tampilkan data saat halaman dimuat
};

function openModal(imagePath) {
    const modal = document.getElementById('proofModal');
    const modalImage = document.getElementById('proofImage');
    const downloadButton = document.getElementById('downloadButton');

    modalImage.src = imagePath; // Set src gambar
    downloadButton.href = imagePath; // Set href untuk tombol unduh
    downloadButton.style.display = 'block'; // Tampilkan tombol unduh

    modal.style.display = 'flex'; // Tampilkan modal
}

// Fungsi untuk menutup modal
function closeModal() {
    const modal = document.getElementById("proofModal");
    modal.style.display = "none";
}

function toggleModal() {
    var modal = document.getElementById("addReportModal");
    if (modal.style.display === "flex") {
        modal.style.display = "none";
    } else {
        modal.style.display = "flex"; // Ubah menjadi "flex" untuk memusatkan modal
    }
}

// Untuk menutup modal saat klik di luar konten modal
window.onclick = function(event) {
    var modal = document.getElementById("addReportModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

function submitReport() {
    const dateInput = document.getElementById('date').value;
    const date = moment(dateInput).format('YYYY-MM-DD');
    const flight = document.getElementById('flight').value;
    const ft = document.getElementById('ft').value;
    const nickname = document.getElementById('nickname').value;
    const proofFile = document.getElementById('proof').files[0];

    // Validasi input
    if (!date || !flight || !ft || !nickname || !proofFile) {
        showNotification('All fields are required!', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('date', date);
    formData.append('flight', flight);
    formData.append('ft', ft);
    formData.append('nickname', nickname);
    formData.append('proof', proofFile);

    fetch('/api/flight-reports', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error); });
        }
        return response.json();
    })
    .then(data => {
        showNotification('Report added successfully!', 'success');
        // Menambahkan data baru ke tabel
        addReportToTable(data.report); // Pindahkan logika penambahan ke fungsi terpisah
        toggleModal();
    })
    .catch(error => {
        console.log('Error object:', error);
        showNotification('Add report failed: ' + error.message, 'error');
    });
}

function addReportToTable(report) {
    const table = document.getElementById('flight-report-table').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    newRow.innerHTML = `
        <td>${report.date}</td>
        <td>${report.flight}</td>
        <td>${report.ft}</td>
        <td>${report.nickname}</td>
        <td><a href="/uploads/${report.proof}" target="_blank">Proof Document</a></td>
    `;
}

// ------------------------------------------------------------------------------------------------------------------ //

                                 // Registration and Login //


function showNotification(message, type) {
    console.log("showNotification called with message:", message); // Debug log
    const notification = document.getElementById('notification');
    notification.textContent = message;

    // Tentukan warna notifikasi berdasarkan tipe (success / error)
    if (type === 'success') {
        notification.classList.remove('error');
        notification.classList.add('success');
    } else if (type === 'error') {
        notification.classList.remove('success');
        notification.classList.add('error');
    }

    // Tampilkan notifikasi dengan animasi0
    notification.classList.remove('hidden', 'slide-out');
    notification.classList.add('show'); // Tambahkan kelas show untuk tampil
    notification.style.opacity = 1; // Pastikan notifikasi terlihat

    // Hilangkan notifikasi setelah 3 detik
    setTimeout(() => {
        notification.classList.add('slide-out'); // Tambahkan kelas slide-out
        setTimeout(() => {
            notification.classList.add('hidden'); // Sembunyikan notifikasi setelah animasi selesai
            notification.style.opacity = 0; // Reset opacity untuk tampilan berikutnya
        }, 500); // Beri waktu untuk slide out
    }, 3000); // Tampilkan selama 3 detik
}

// Contoh penggunaan fungsi showNotification:
// showNotification("Kode verifikasi dikirimkan ke email anda", 'success');
// showNotification("Register gagal! Kode verifikasi salah.", 'error');

// Fungsi untuk menangani pengiriman kode verifikasi
function sendVerificationCode(event) {
    event.preventDefault(); // Mencegah pengiriman form secara default

    const email = document.getElementById('emailInput').value; // Ambil input email

    fetch('/send-verification-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email }) // Kirim email dalam format JSON
    })
    .then(response => {
        if (response.ok) {
            showNotification('Kode verifikasi telah dikirim ke email Anda.', 'success'); // Notifikasi sukses
            // Tampilkan form verifikasi
            document.getElementById('verificationForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
        } else {
            showNotification('Gagal mengirim kode verifikasi.', 'error'); // Notifikasi gagal
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Terjadi kesalahan dalam pengiriman kode.', 'error'); // Notifikasi kesalahan
    });
}

// Fungsi untuk menangani pendaftaran setelah mendapatkan kode verifikasi
function registerUser(event) {
    event.preventDefault(); // Mencegah pengiriman form secara default

    const email = document.getElementById('emailInput').value; // Ambil email dari input
    const nickname = event.target.nickname.value; // Ambil input nickname
    const verificationCode = event.target.verificationCode.value; // Ambil input kode verifikasi
    const password = event.target.password.value; // Ambil input password

    // Kirim data registrasi ke server
    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, nickname, verificationCode, password }) // Kirim data dalam format JSON
    })
    .then(response => {
        if (response.ok) {
            return response.json(); // Mengembalikan data JSON jika berhasil
        }
        return response.json().then(err => { throw new Error(err.message); }); // Menangkap pesan error dari backend
    })

    .then(data => {
        console.log('Registration successful:', data);
        showNotification('Pendaftaran berhasil!', 'success'); // Notifikasi sukses
        setTimeout(() => { // Menunda pengalihan selama 2 detik
            window.location.href = '/login'; // Alihkan ke halaman login setelah berhasil
        }, 2000);
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Pendaftaran gagal: ' + error.message, 'error'); // Notifikasi gagal
    });
}

// Menghubungkan fungsi dengan form listener
document.getElementById('registerForm').addEventListener('submit', sendVerificationCode);
document.getElementById('verificationForm').addEventListener('submit', registerUser);

function login() {
    const email = document.getElementById('emailInput').value; // Ambil email dari input
    const password = document.getElementById('passwordInput').value; // Ambil password dari input

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Penting untuk menyertakan cookie
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Login Berhasil!') {
            // Simpan pesan ke localStorage
            localStorage.setItem('notification', 'Login berhasil!');
            // Simpan token setelah login
            localStorage.setItem('token', data.token);

            // Alihkan pengguna ke halaman utama
            window.location.href = data.redirect; // Menggunakan URL dari respons
        } else {
            // Tampilkan pesan kesalahan jika ada
            showNotification('Login gagal! Email atau password salah.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Login gagal! Terjadi kesalahan pada server.', true); // Tampilkan pesan kesalahan
    });
}

// Listener untuk form login
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Mencegah pengiriman form secara default
    login(); // Panggil fungsi login
});

// ------------------------------------------------------------------------------------------------------------------ //

                                 // Flops //

document.addEventListener('DOMContentLoaded', function() {
    // Menangani klik pada link bandara
    const airportLinks = document.querySelectorAll('a[data-icao]');
    airportLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const icao = this.getAttribute('data-icao');
            loadAirportDetails(icao);
        });
    });

    function loadAirportDetails(icao) {
        const airport = airports[icao];
        if (airport) {
            // Tampilkan nama bandara
            document.getElementById('airport-name').textContent = airport.name;
            document.getElementById('icao-iata').textContent = `${airport.icao} / ${airport.iata}`;
            document.getElementById('name').textContent = airport.name;
            document.getElementById('city-country').textContent = airport.cityCountry;
            document.getElementById('elevation').textContent = airport.elevation;
            document.getElementById('type').textContent = airport.type;
            document.getElementById('ifr').textContent = airport.ifr;

            // Tampilkan runway
            const runwaysList = document.getElementById('runways-list');
            runwaysList.innerHTML = '';
            airport.runways.forEach(runway => {
                const runwayInfo = document.createElement('p');
                runwayInfo.textContent = `Runway ${runway.runway}: Course ${runway.course}, Length ${runway.length}, Elevation ${runway.elevation}`;
                runwaysList.appendChild(runwayInfo);
            });

            // Tampilkan airport charts
            const chartList = document.getElementById('chart-list');
            chartList.innerHTML = '';
            airport.charts.forEach(chart => {
                const chartItem = document.createElement('li');
                const chartLink = document.createElement('a');
                chartLink.href = chart.link;
                chartLink.textContent = `${chart.code} ${chart.name}`;
                chartItem.appendChild(chartLink);
                chartList.appendChild(chartItem);
            });

            // Tampilkan detail bandara
            document.getElementById('airport-details').classList.remove('hidden');
        }
    }
});