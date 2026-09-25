# ============ Build Stage ============
FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y \
    build-essential libtool autotools-dev automake pkg-config \
    libssl-dev libevent-dev bsdmainutils python3 git wget \
    libboost-system-dev libboost-filesystem-dev \
    libboost-chrono-dev libboost-test-dev libboost-thread-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
# ⚠️ YOUR_USERNAME আপনার GitHub ইউজারনেম দিয়ে পাল্টান
RUN git clone --depth 1 https://github.com/YOUR_USERNAME/doomcoin-core.git . \
    && ./autogen.sh \
    && ./configure --without-gui --disable-tests --disable-bench \
    && make -j$(nproc)

# ============ Runtime Stage ============
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    libssl3 libevent-2.1-7 \
    libboost-filesystem1.74.0 libboost-program-options1.74.0 \
    libboost-thread1.74.0 libboost-chrono1.74.0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /src/src/bitcoind /usr/local/bin/bitcoind
COPY --from=builder /src/src/bitcoin-cli /usr/local/bin/bitcoin-cli
COPY doomcoin.conf /etc/doomcoin/doomcoin.conf

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3333 3334

CMD ["bitcoind", \
     "-conf=/etc/doomcoin/doomcoin.conf", \
     "-datadir=/data", \
     "-printtoconsole", \
     "-server=1"]
