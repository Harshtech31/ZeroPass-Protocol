cmake_minimum_required(VERSION 3.20)
project(ZeroPassSecurityEngine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find packages
find_package(Protobuf REQUIRED)
find_package(OpenSSL REQUIRED)

include(FindPkgConfig)
pkg_check_modules(GRPC REQUIRED grpc++)
pkg_check_modules(GRPC_CPP REQUIRED grpc++_unsecure)

# Protobuf & gRPC generation
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin)
if(NOT GRPC_CPP_PLUGIN)
    message(FATAL_ERROR "grpc_cpp_plugin not found")
endif()

set(PROTO_SRC "${CMAKE_CURRENT_SOURCE_DIR}/proto/security.proto")
set(PROTO_GEN_DIR "${CMAKE_CURRENT_BINARY_DIR}")

add_custom_command(
    OUTPUT "${PROTO_GEN_DIR}/security.pb.h"
           "${PROTO_GEN_DIR}/security.pb.cc"
           "${PROTO_GEN_DIR}/security.grpc.pb.h"
           "${PROTO_GEN_DIR}/security.grpc.pb.cc"
    COMMAND ${Protobuf_PROTOC_EXECUTABLE}
    ARGS --cpp_out "${PROTO_GEN_DIR}"
         --grpc_out "${PROTO_GEN_DIR}"
         --plugin "protoc-gen-grpc=${GRPC_CPP_PLUGIN}"
         -I "${CMAKE_CURRENT_SOURCE_DIR}/proto"
         "${PROTO_SRC}"
    DEPENDS "${PROTO_SRC}"
    COMMENT "Generating gRPC and Protobuf files from ${PROTO_SRC}"
)

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/src)
include_directories(${PROTO_GEN_DIR})

# Define the service
add_executable(security_engine
    src/main.cpp
    src/crypto.cpp
    "${PROTO_GEN_DIR}/security.pb.cc"
    "${PROTO_GEN_DIR}/security.grpc.pb.cc"
)

target_link_libraries(security_engine
    ${GRPC_LIBRARIES}
    protobuf::libprotobuf
    OpenSSL::SSL
    OpenSSL::Crypto
)
