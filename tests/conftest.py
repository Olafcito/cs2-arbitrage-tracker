import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "integration: hits real external APIs, opt-in only")
