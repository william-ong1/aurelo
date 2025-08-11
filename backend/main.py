class Asset:
    def __init__(self, name: str, ticker=None, num_shares=None, price=None, balance=None, apy=None):
        self.name = name
        self.ticker = ticker
        self.num_shares = num_shares
        self.price = price
        self.balance = balance
        self.apy = apy


class StockAsset(Asset):
    def __init__(self, name, ticker, num_shares, price):
        super().__init__(name, ticker=ticker, num_shares=num_shares, price=price)


class BankAsset(Asset):
    def __init__(self, name, balance, apy):
        super().__init__(name, balance=balance, apy=apy)


class Portfolio:
    def __init__(self):
        self.assets = []
        self.value = 0

    def add_stock_asset(self, asset: StockAsset):
        self.assets.append(asset)
        if asset.num_shares is not None and asset.price is not None:
            self.value += asset.num_shares * asset.price

    def add_bank_asset(self, asset: BankAsset):
        self.assets.append(asset)
        if asset.balance is not None:
            self.value += asset.balance


