import React from 'react';

function NotFound() {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light text-center">
      <h1 className="display-1 fw-bold text-danger">404</h1>
      <p className="fs-3"> <span className="text-danger">Oops!</span> Halaman tidak ditemukan.</p>
      <p className="lead">
        Maaf, halaman yang kamu cari tidak tersedia.
      </p>
      <a href="/" className="btn btn-primary">
        Kembali ke Beranda
      </a>
    </div>
  );
}

export default NotFound;
