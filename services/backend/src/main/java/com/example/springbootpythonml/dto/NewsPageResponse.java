package com.example.springbootpythonml.dto;

import com.example.springbootpythonml.entity.News;

import java.util.List;

public class NewsPageResponse {
    private List<News> items;
    private int page;
    private int size;
    private long total;
    private boolean hasMore;

    public NewsPageResponse(List<News> items, int page, int size, long total, boolean hasMore) {
        this.items = items;
        this.page = page;
        this.size = size;
        this.total = total;
        this.hasMore = hasMore;
    }

    public List<News> getItems() { return items; }
    public void setItems(List<News> items) { this.items = items; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }

    public boolean isHasMore() { return hasMore; }
    public void setHasMore(boolean hasMore) { this.hasMore = hasMore; }
}