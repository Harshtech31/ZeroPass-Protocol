FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    pkg-config \
    libssl-dev \
    libgrpc++-dev \
    libprotobuf-dev \
    protobuf-compiler-grpc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all build dependencies and source code
COPY CMakeLists.txt .
COPY proto/ ./proto/
COPY src/ ./src/

# Build the engine in Release mode
RUN mkdir build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc)

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    libssl3 \
    libgrpc++1 \
    libprotobuf23 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r zeropass && useradd -r -g zeropass zeropass
WORKDIR /app

COPY --from=builder /app/build/security_engine .
RUN chown zeropass:zeropass security_engine

USER zeropass
EXPOSE 50051

CMD ["./security_engine"]
