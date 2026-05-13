from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from core.config import settings
from routers import auth, users, audit, oauth, admin
from core.logging import setup_logging, CorrelationIdMiddleware

setup_logging()

app = FastAPI(
    title=settings.app_name,
    description="Passwordless authentication API using WebAuthn/FIDO2",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Expose Prometheus metrics
Instrumentator().instrument(app).expose(app)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

app.add_middleware(CorrelationIdMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3005",
        "http://127.0.0.1:3005",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(oauth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.app_name}"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
