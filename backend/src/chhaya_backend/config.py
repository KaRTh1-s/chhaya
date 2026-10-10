"""Configuration settings for Chhaya Backend loaded from environment variables."""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    table_name: str
    data_mode: str  # "live" or "fixture"
    write_passcode: str
    cors_origin: str
    bedrock_region: str
    app_version: str
    aws_region: str

def get_config() -> Config:
    return Config(
        table_name=os.environ.get("CHHAYA_TABLE", "chhaya-data"),
        data_mode=os.environ.get("CHHAYA_DATA_MODE", "live").lower(),
        write_passcode=os.environ.get("WRITE_PASSCODE", "demo"),
        cors_origin=os.environ.get("CORS_ORIGIN", "*"),
        bedrock_region=os.environ.get("BEDROCK_REGION", "us-east-1"),
        app_version=os.environ.get("APP_VERSION", "0.2.0"),
        aws_region=os.environ.get("AWS_REGION", "ap-south-1"),
    )
